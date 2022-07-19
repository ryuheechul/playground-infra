// TODO rename env var
const domain = Deno.env.get("FULL_URL_TO_TEST") || "";

async function request(path) {
  try {
    const fullPath = `${domain}${path}`
    console.log(fullPath);
    let resp = await fetch(fullPath);
    console.log(resp.status); // 200
    console.log(resp.headers.get("Content-Type")); // "text/html"
    console.log(await resp.text()); // "Hello, World!"
  }
  catch (e) {
    console.error(e)
  }
}

const random = (n) => Math.floor(Math.random() * n) + 1;

const ping = () => request('/ping')
const simulate = () => request('/simulate')

const pickRandomRoute = () => random(4) == 1 ? ping() : simulate();

setInterval(pickRandomRoute, 1000);
