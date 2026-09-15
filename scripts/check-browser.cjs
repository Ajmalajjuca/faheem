const fs = require("node:fs");
const WebSocket = require("/usr/share/nodejs/ws");
(async () => {
  const tabs = await (await fetch("http://127.0.0.1:9236/json/list")).json();
  const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.on("open", resolve);
    ws.on("error", reject);
  });
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.on("message", (msg) => {
    const data = JSON.parse(msg);
    if (data.id && pending.has(data.id)) {
      pending.get(data.id)(data);
      pending.delete(data.id);
    }
    if (data.method === "Runtime.exceptionThrown")
      errors.push(data.params.exceptionDetails.text);
  });
  const call = (method, params = {}) =>
    new Promise((resolve) => {
      const n = ++id;
      pending.set(n, resolve);
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  const evaluate = async (expression) => {
    const response = await call("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (response.result.exceptionDetails)
      throw new Error(JSON.stringify(response.result.exceptionDetails));
    return response.result.result.value;
  };
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  await call("Page.enable");
  await call("Page.bringToFront");
  await call("Runtime.enable");
  const mode = process.argv[2] || "desktop";
  await call("Emulation.setEmulatedMedia", {
    features: [
      {
        name: "prefers-reduced-motion",
        value: mode === "reduced" ? "reduce" : "no-preference",
      },
    ],
  });
  if (mode === "pdf") {
    await call("Page.navigate", { url: "http://127.0.0.1:5173/resume.html" });
    await pause(1000);
    const result = await call("Page.printToPDF", {
      printBackground: true,
      preferCSSPageSize: true,
    });
    fs.writeFileSync(
      "public/faheem-ahmed-koppal-cv.pdf",
      Buffer.from(result.result.data, "base64"),
    );
    console.log("Generated CV PDF");
  } else if (mode === "reference-live" || mode === "reference-tour") {
    await pause(1000);
  } else if (mode === "scroll") {
    await evaluate(
      `document.querySelector(${JSON.stringify(process.argv[3] || "#work")}).scrollIntoView({behavior:'instant'})`,
    );
    await pause(1200);
  } else {
    const width = mode === "mobile" ? 390 : mode === "small" ? 320 : 1440;
    await call("Emulation.setDeviceMetricsOverride", {
      width,
      height: width < 600 ? 844 : 1000,
      deviceScaleFactor: 1,
      mobile: width < 600,
    });
    await call("Page.navigate", {
      url: mode.startsWith("reference")
        ? "https://www.noth.in/"
        : "http://127.0.0.1:5173",
    });
    await pause(mode.startsWith("reference") ? 10000 : 2200);
    await evaluate(
      "Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,8000))])",
    );
    await pause(1000);
  }
  if (mode.startsWith("reference")) {
    if (mode === "reference-tour") {
      await call("Input.dispatchMouseEvent", {
        type: "mouseWheel",
        x: 900,
        y: 700,
        deltaX: 0,
        deltaY: 650,
      });
      const samples = [];
      for (let i = 0; i < 8; i++) {
        samples.push(await evaluate("scrollY"));
        await pause(100);
      }
      console.log("REFERENCE WHEEL", samples);
      for (const [name, y] of [
        ["work", 2600],
        ["studio", 6500],
        ["objects", 8350],
      ]) {
        await evaluate(`window.scrollTo({top:${y},behavior:'instant'})`);
        await pause(1500);
        await call("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: 550,
          y: 550,
        });
        await pause(400);
        const capture = await call("Page.captureScreenshot", { format: "png" });
        fs.writeFileSync(
          `/tmp/nothin-tour-${name}.png`,
          Buffer.from(capture.result.data, "base64"),
        );
      }
    }
    if (mode === "reference-hover" || mode === "reference-live") {
      for (let i = 0; i < 28; i++) {
        await call("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: 180 + i * 35,
          y: 450 + Math.sin(i * 0.4) * 90,
        });
        await pause(25);
      }
    }
    console.log("BROWSER ERRORS", errors);
    if (mode === "reference-wheel") {
      await call("Input.dispatchMouseEvent", {
        type: "mouseWheel",
        x: 900,
        y: 700,
        deltaX: 0,
        deltaY: 650,
      });
      const samples = [];
      for (let i = 0; i < 8; i++) {
        samples.push(await evaluate("scrollY"));
        await pause(100);
      }
      console.log("SCROLL SAMPLES", samples);
    }
    console.log(
      JSON.stringify(
        await evaluate(
          `({canvases:[...document.querySelectorAll('canvas')].map(e=>({class:e.className,width:e.width,height:e.height,parent:e.parentElement.className})),hero:[...document.querySelectorAll('[class*=hero],[class*=cursor],[class*=trail]')].slice(0,30).map(e=>({tag:e.tagName,class:e.className})),globals:Object.keys(window).filter(k=>/lenis|fluid|hero|cursor|scroll/i.test(k)),sections:[...document.querySelectorAll('section')].map(e=>({class:e.className,top:e.offsetTop,height:e.offsetHeight}))})`,
        ),
        null,
        2,
      ),
    );
  }
  if (mode === "interactions") {
    const results = [];
    await evaluate(`document.querySelector('.menu-trigger').click()`);
    await pause(250);
    results.push([
      "menu opens",
      await evaluate(`document.querySelector('dialog')?.open === true`),
    ]);
    await call("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
    });
    await pause(200);
    results.push([
      "Escape closes",
      await evaluate(`!document.querySelector('dialog')`),
    ]);
    await evaluate(`document.querySelector('.project').click()`);
    await pause(200);
    results.push([
      "project details",
      await evaluate(
        `document.querySelector('.project-story').textContent.includes('AI-first')`,
      ),
    ]);
    await evaluate(`document.querySelector('.next-project').click()`);
    await pause(100);
    results.push([
      "next project",
      await evaluate(
        `document.querySelector('.project-story').textContent.includes('106')`,
      ),
    ]);
    await evaluate(
      `document.querySelector('.close-button').click(); document.querySelector('.text-link').click()`,
    );
    await pause(200);
    await evaluate(
      `[...document.querySelectorAll('.filters button')].find(e=>e.textContent==='Research').click()`,
    );
    await pause(100);
    results.push([
      "research filter",
      await evaluate(
        `document.querySelectorAll('.work-index .project').length===1 && document.querySelector('.work-index').textContent.includes('Royal Enfield')`,
      ),
    ]);
    await evaluate(
      `document.querySelector('.close-button').click(); document.querySelector('.hero .pill').click()`,
    );
    await pause(200);
    results.push([
      "contact email",
      await evaluate(
        `document.querySelector('.contact-email').getAttribute('href')==='mailto:faheem.koppal09@gmail.com'`,
      ),
    ]);
    results.push([
      "contact phone",
      await evaluate(
        `document.querySelector('.contact-secondary a').getAttribute('href')==='tel:+918147399657'`,
      ),
    ]);
    await evaluate(
      `document.querySelector('.close-button').click(); document.querySelector('.service button').click()`,
    );
    await pause(100);
    results.push([
      "service accordion",
      await evaluate(
        `document.querySelector('.service button').getAttribute('aria-expanded')==='true'`,
      ),
    ]);
    await evaluate(`document.querySelector('.floating-object').click()`);
    results.push([
      "object interaction",
      await evaluate(
        `document.querySelector('.object-playground').classList.contains('scattered')`,
      ),
    ]);
    const cv = await (
      await fetch("http://127.0.0.1:5173/faheem-ahmed-koppal-cv.pdf")
    ).arrayBuffer();
    results.push([
      "CV is PDF",
      Buffer.from(cv).subarray(0, 4).toString() === "%PDF",
    ]);
    console.log(JSON.stringify({ results, errors }, null, 2));
    if (results.some(([, pass]) => !pass) || errors.length)
      process.exitCode = 1;
  }
  if (mode === "motion") {
    const results = [];
    results.push([
      "Lenis enabled",
      await evaluate(`document.documentElement.classList.contains('lenis')`),
    ]);
    for (let i = 0; i < 35; i++) {
      await call("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: 170 + i * 30,
        y: 480 + Math.sin(i * 0.3) * 95,
      });
      await pause(22);
    }
    const shot = await call("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(
      "/tmp/faheem-fluid-active.png",
      Buffer.from(shot.result.data, "base64"),
    );
    results.push([
      "Fluid mask contains visible pixels",
      await evaluate(
        `(()=>{const c=document.querySelector('.hero-fluid');const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<p.length;i+=4)if(p[i]>50)n++;return n>2000})()`,
      ),
    ]);
    const initial = await evaluate("scrollY");
    await call("Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: 1250,
      y: 700,
      deltaX: 0,
      deltaY: 650,
    });
    const positions = [];
    for (let i = 0; i < 10; i++) {
      positions.push(await evaluate("scrollY"));
      await pause(80);
    }
    results.push([
      "Wheel movement eases over time",
      new Set(positions).size > 2 && positions.at(-1) > initial + 500,
    ]);
    console.log("WHEEL SAMPLES", positions);
    await pause(800);
    results.push([
      "Hero film revealed by scroll",
      await evaluate(
        `Number(getComputedStyle(document.querySelector('.hero-scroll-film')).opacity)>.8`,
      ),
    ]);
    await evaluate(
      `document.querySelector('.project').scrollIntoView({behavior:'instant',block:'center'})`,
    );
    await pause(2200);
    const rect = await evaluate(
      `(()=>{const r=document.querySelector('.project-image').getBoundingClientRect();return{x:r.left+100,y:r.top+100}})()`,
    );
    await call("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: rect.x,
      y: rect.y,
    });
    await pause(550);
    results.push([
      "Project cursor follows pointer",
      await evaluate(
        `(()=>{const c=document.querySelector('.project-explore'),r=c.getBoundingClientRect();return document.querySelector('.project').classList.contains('cursor-active')&&Number(getComputedStyle(c).opacity)>.9&&r.width>50&&r.top>0&&r.top<innerHeight})()`,
      ),
    ]);
    console.log(
      "CURSOR BOUNDS",
      await evaluate(
        `(()=>{const e=document.querySelector('.project-explore');const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,transform:getComputedStyle(e).transform,visibility:getComputedStyle(e).visibility,display:getComputedStyle(e).display}})()`,
      ),
    );
    const workShot = await call("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(
      "/tmp/faheem-project-hover.png",
      Buffer.from(workShot.result.data, "base64"),
    );
    await evaluate(
      `document.querySelector('.film-stage').scrollIntoView({behavior:'instant',block:'start'});window.scrollBy({top:900,behavior:'instant'})`,
    );
    await pause(2000);
    results.push([
      "Film pulls into gallery",
      await evaluate(
        `parseFloat(document.querySelector('.film-stage-screen').style.width)<60`,
      ),
    ]);
    const filmShot = await call("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(
      "/tmp/faheem-film-stage.png",
      Buffer.from(filmShot.result.data, "base64"),
    );
    console.log(JSON.stringify({ results, errors }, null, 2));
    if (results.some(([, pass]) => !pass) || errors.length)
      process.exitCode = 1;
  }
  if (mode === "reduced") {
    const results = [];
    const reducedState = () =>
      evaluate(
        `!document.documentElement.classList.contains('lenis') && document.querySelectorAll('.pin-spacer').length===0 && getComputedStyle(document.querySelector('.hero-fluid')).display==='none' && [...document.querySelectorAll('.motion-video')].every(v=>v.paused)`,
      );
    results.push([
      "Reduced motion disables fluid, pinning, smooth scrolling and video",
      await reducedState(),
    ]);
    await call("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
    });
    await pause(1600);
    results.push([
      "Enabling motion initializes once",
      await evaluate(
        `document.documentElement.classList.contains('lenis') && document.querySelectorAll('.pin-spacer').length===2`,
      ),
    ]);
    await call("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    await pause(300);
    results.push(["Live preference cleanup", await reducedState()]);
    console.log(JSON.stringify({ results, errors }, null, 2));
    if (results.some(([, pass]) => !pass) || errors.length)
      process.exitCode = 1;
  }
  if (mode === "small" || mode === "mobile") {
    const safe = await evaluate(
      `document.documentElement.scrollWidth<=document.documentElement.clientWidth && document.querySelectorAll('.pin-spacer').length===0`,
    );
    console.log("Mobile layout and native scroll:", safe);
    if (!safe || errors.length) process.exitCode = 1;
  }
  console.log(
    JSON.stringify(
      await evaluate(
        `({ title:document.title, width:innerWidth, clientWidth:document.documentElement.clientWidth, scrollWidth:document.documentElement.scrollWidth, height:document.documentElement.scrollHeight, headings:document.querySelectorAll('h1').length, brokenImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src), overflow:[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>document.documentElement.clientWidth+2&&getComputedStyle(e).position!=='absolute'}).slice(0,15).map(e=>({tag:e.tagName,class:e.className,right:e.getBoundingClientRect().right})), heroWidth:document.querySelector('h1')?.getBoundingClientRect().width, heroScrollWidth:document.querySelector('h1')?.scrollWidth })`,
      ),
      null,
      2,
    ),
  );
  if (mode !== "pdf") {
    const screenshot = await call("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    fs.writeFileSync(
      `/tmp/faheem-${mode}${mode === "scroll" ? "-" + process.argv[3].replace("#", "") : ""}.png`,
      Buffer.from(screenshot.result.data, "base64"),
    );
  }
  ws.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
