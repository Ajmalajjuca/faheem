// The flow runs on a small velocity grid, but the reveal mask is transported
// independently at high resolution. A derivative-antialiased edge avoids blur.
const vertex = `#version 300 es
precision highp float;
out vec2 uv;
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
const header = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 color;
`;
const fragments = {
  advect: `uniform sampler2D field,velocity;uniform vec2 texel;uniform float dt,decay;
    void main(){color=texture(field,uv-dt*texture(velocity,uv).xy*texel)*decay;}`,
  splat: `uniform sampler2D field;uniform vec2 point;uniform vec3 impulse;uniform float aspect,radius;
    void main(){vec2 p=uv-point;p.x*=aspect;color=texture(field,uv)+vec4(impulse*exp(-dot(p,p)/radius),0.);}`,
  divergence: `uniform sampler2D velocity;uniform vec2 texel;
    void main(){float l=texture(velocity,uv-vec2(texel.x,0)).x,r=texture(velocity,uv+vec2(texel.x,0)).x;
    float b=texture(velocity,uv-vec2(0,texel.y)).y,t=texture(velocity,uv+vec2(0,texel.y)).y;color=vec4(.5*(r-l+t-b),0,0,1);}`,
  pressure: `uniform sampler2D field,divergence;uniform vec2 texel;
    void main(){float l=texture(field,uv-vec2(texel.x,0)).x,r=texture(field,uv+vec2(texel.x,0)).x;
    float b=texture(field,uv-vec2(0,texel.y)).x,t=texture(field,uv+vec2(0,texel.y)).x;color=vec4((l+r+b+t-texture(divergence,uv).x)*.25,0,0,1);}`,
  project: `uniform sampler2D field,velocity;uniform vec2 texel;
    void main(){float l=texture(field,uv-vec2(texel.x,0)).x,r=texture(field,uv+vec2(texel.x,0)).x;
    float b=texture(field,uv-vec2(0,texel.y)).x,t=texture(field,uv+vec2(0,texel.y)).x;color=vec4(texture(velocity,uv).xy-.5*vec2(r-l,t-b),0,1);}`,
  curl: `uniform sampler2D velocity;uniform vec2 texel;
    void main(){float l=texture(velocity,uv-vec2(texel.x,0)).y,r=texture(velocity,uv+vec2(texel.x,0)).y;
    float b=texture(velocity,uv-vec2(0,texel.y)).x,t=texture(velocity,uv+vec2(0,texel.y)).x;color=vec4(.5*(r-l-t+b),0,0,1);}`,
  vorticity: `uniform sampler2D velocity,curl;uniform vec2 texel;uniform float dt;
    void main(){float l=abs(texture(curl,uv-vec2(texel.x,0)).x),r=abs(texture(curl,uv+vec2(texel.x,0)).x);
    float b=abs(texture(curl,uv-vec2(0,texel.y)).x),t=abs(texture(curl,uv+vec2(0,texel.y)).x);
    vec2 force=.5*vec2(t-b,l-r);force=force/(length(force)+.0001)*texture(curl,uv).x*12.;
    color=vec4(clamp(texture(velocity,uv).xy+force*dt,vec2(-800),vec2(800)),0,1);}`,
  display: `uniform sampler2D dye,film;uniform vec2 viewSize,artSize;
    void main(){float d=texture(dye,uv).r;float edge=max(fwidth(d)*.85,.003);
    float alpha=smoothstep(.16-edge,.16+edge,d);vec2 p=(uv-.5)*viewSize/artSize+.5;
    vec3 rgb=vec3(.008);if(all(greaterThanEqual(p,vec2(0)))&&all(lessThanEqual(p,vec2(1))))rgb=texture(film,p).rgb;
    color=vec4(rgb,alpha);}`,
};

export function createGpuFluid(canvas) {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: false,
    powerPreference: "high-performance",
  });
  if (!gl || !gl.getExtension("EXT_color_buffer_float")) return null;
  const programs = {};
  const targets = [];
  let film,
    vao,
    width,
    height,
    gutter,
    velocity,
    dye,
    pressure,
    divergence,
    curl;
  let lastVideoTime = -1;
  function shader(type, source) {
    const result = gl.createShader(type);
    gl.shaderSource(result, source);
    gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(result);
      gl.deleteShader(result);
      throw new Error(message);
    }
    return result;
  }
  function disposeTargets() {
    targets.forEach((t) => {
      gl.deleteTexture(t.texture);
      gl.deleteFramebuffer(t.fbo);
    });
    targets.length = 0;
  }
  function destroy() {
    disposeTargets();
    Object.values(programs).forEach((p) => gl.deleteProgram(p.program));
    gl.deleteTexture(film);
    gl.deleteVertexArray(vao);
  }
  try {
    const vert = shader(gl.VERTEX_SHADER, vertex);
    for (const [name, source] of Object.entries(fragments)) {
      const frag = shader(gl.FRAGMENT_SHADER, header + source);
      const program = gl.createProgram();
      gl.attachShader(program, vert);
      gl.attachShader(program, frag);
      gl.linkProgram(program);
      gl.deleteShader(frag);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const message = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new Error(message);
      }
      const uniforms = {};
      for (
        let i = 0;
        i < gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        i++
      ) {
        const u = gl.getActiveUniform(program, i);
        uniforms[u.name] = {
          type: u.type,
          location: gl.getUniformLocation(program, u.name),
        };
      }
      programs[name] = { program, uniforms };
    }
    gl.deleteShader(vert);
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    film = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, film);
    textureParameters();
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([2, 2, 2, 255]),
    );
  } catch (error) {
    destroy();
    throw error;
  }
  function textureParameters() {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  function target(w, h) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    textureParameters();
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA16F,
      w,
      h,
      0,
      gl.RGBA,
      gl.HALF_FLOAT,
      null,
    );
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0,
    );
    const result = { texture, fbo, width: w, height: h };
    targets.push(result);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
      throw new Error("Fluid framebuffer unavailable");
    return result;
  }
  function pair(w, h) {
    return {
      read: target(w, h),
      write: target(w, h),
      swap() {
        [this.read, this.write] = [this.write, this.read];
      },
    };
  }
  function pass(name, output, values) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, output?.fbo || null);
    gl.viewport(
      0,
      0,
      output?.width || canvas.width,
      output?.height || canvas.height,
    );
    const p = programs[name];
    gl.useProgram(p.program);
    let unit = 0;
    for (const [name, value] of Object.entries(values)) {
      const u = p.uniforms[name];
      if (!u) continue;
      if (u.type === gl.SAMPLER_2D) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, value.texture || value);
        gl.uniform1i(u.location, unit++);
      } else if (u.type === gl.FLOAT_VEC2) gl.uniform2fv(u.location, value);
      else if (u.type === gl.FLOAT_VEC3) gl.uniform3fv(u.location, value);
      else gl.uniform1f(u.location, value);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function clear() {
    gl.clearColor(0, 0, 0, 0);
    targets.forEach((t) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
      gl.clear(gl.COLOR_BUFFER_BIT);
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  return {
    resize(w, h, padding) {
      width = w;
      height = h;
      gutter = padding;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * ratio);
      canvas.height = Math.round(h * ratio);
      const sw = w < 600 ? 160 : 256,
        sh = Math.max(96, Math.round((sw * h) / w));
      const dw = Math.min(1536, Math.max(768, Math.round(w * ratio))),
        dh = Math.round((dw * h) / w);
      disposeTargets();
      velocity = pair(sw, sh);
      pressure = pair(sw, sh);
      dye = pair(dw, dh);
      divergence = target(sw, sh);
      curl = target(sw, sh);
      canvas.dataset.renderer = "webgl2";
      canvas.dataset.maskResolution = `${dw}x${dh}`;
      clear();
    },
    frame(dt, points, video) {
      gl.disable(gl.BLEND);
      const texel = [1 / velocity.read.width, 1 / velocity.read.height];
      for (const p of points) {
        const values = {
          point: [p.x, p.y],
          aspect: width / height,
          radius: width < 600 ? 0.00055 : 0.00032,
        };
        pass("splat", velocity.write, {
          ...values,
          field: velocity.read,
          impulse: [p.dx * 6500, p.dy * 6500, 0],
        });
        velocity.swap();
        pass("splat", dye.write, {
          ...values,
          field: dye.read,
          impulse: [0.8, 0, 0],
        });
        dye.swap();
      }
      pass("advect", velocity.write, {
        field: velocity.read,
        velocity: velocity.read,
        texel,
        dt,
        decay: Math.pow(0.975, dt * 60),
      });
      velocity.swap();
      pass("curl", curl, { velocity: velocity.read, texel });
      pass("vorticity", velocity.write, {
        velocity: velocity.read,
        curl,
        texel,
        dt,
      });
      velocity.swap();
      pass("divergence", divergence, { velocity: velocity.read, texel });
      for (let i = 0; i < 16; i++) {
        pass("pressure", pressure.write, {
          field: pressure.read,
          divergence,
          texel,
        });
        pressure.swap();
      }
      pass("project", velocity.write, {
        field: pressure.read,
        velocity: velocity.read,
        texel,
      });
      velocity.swap();
      pass("advect", dye.write, {
        field: dye.read,
        velocity: velocity.read,
        texel,
        dt,
        decay: Math.pow(0.986, dt * 60),
      });
      dye.swap();
      if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
        gl.bindTexture(gl.TEXTURE_2D, film);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          video,
        );
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        lastVideoTime = video.currentTime;
      }
      const artWidth = width - gutter * 2;
      pass("display", null, {
        dye: dye.read,
        film,
        viewSize: [width, height],
        artSize: [artWidth, (artWidth * 9) / 16],
      });
    },
    clear,
    destroy,
  };
}
