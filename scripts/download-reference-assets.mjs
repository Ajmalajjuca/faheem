// Visual references for the local preview. Replace before publishing your portfolio.
import { mkdir, writeFile } from "node:fs/promises";
const base = "https://cdn.prod.website-files.com/";
const assets = {
  "heart.webp":
    "6a0c501c42b9751b78a9d1a7/6a101bf4026551468ed05521_coeur-bulle-nb.webp",
  "foil.webp":
    "6a0c501c42b9751b78a9d1a7/6a101bf3288a762026817436_papier-froisse.webp",
  "asterisk.webp":
    "6a0c501c42b9751b78a9d1a7/6a101bf33377567d8f2bd507_asterix.webp",
  "candy.webp": "6a0c501c42b9751b78a9d1a7/6a101bf4d60716b3d6959657_bonbon.webp",
  "pink.webp": "6a0c501c42b9751b78a9d1a7/6a101c34913dd6111b16324e_chwing.webp",
  "utopia.webp":
    "6a2679b9acc91890e34df140/6a319bb9740ace5d22b1065c_work-vignette-utopia-V2.webp",
  "aurbse.webp":
    "6a2679b9acc91890e34df140/6a319bce1522d2bb4973451c_work-vignette-aurbse-V2.webp",
  "incognita.jpg":
    "6a2679b9acc91890e34df140/6a319be381e9a44c6244424b_work-vignette-in-cognita-V3.jpg",
  "lgm.jpg":
    "6a2679b9acc91890e34df140/6a319c01066b4f2379f3db78_work-vignette-lgm-V2.jpg",
  "haptify.webp":
    "6a2679b9acc91890e34df140/6a319bf45a0a1fa70477531a_work-vignette-haptify-V2.webp",
  "sculpture.webp":
    "6a0c501c42b9751b78a9d1a7/6a3171d9fb2a39d8054e9252_beton-plastic-V2.webp",
  "sphere.webp":
    "6a0c501c42b9751b78a9d1a7/6a317205d7b275b2d2985000_boule-chelou-coline-V2.webp",
};
await mkdir(new URL("../public/images/", import.meta.url), { recursive: true });
for (const [name, path] of Object.entries(assets)) {
  const response = await fetch(base + path);
  if (!response.ok) throw new Error(`${name}: ${response.status}`);
  await writeFile(
    new URL(`../public/images/${name}`, import.meta.url),
    Buffer.from(await response.arrayBuffer()),
  );
  console.log(`Downloaded ${name}`);
}
