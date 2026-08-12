const $ = id => document.getElementById(id);

document.querySelectorAll(".navbtn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".navbtn").forEach(x => x.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(x => x.classList.remove("active-panel"));
    btn.classList.add("active");
    $(btn.dataset.target).classList.add("active-panel");
    window.scrollTo({top: 0, behavior: "smooth"});
  });
});

$("themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("light");
});

function setResult(id, html){ $(id).innerHTML = html; }

async function api(url, options){
  const r = await fetch(url, options);
  const data = await r.json().catch(() => ({error:"Invalid server response"}));
  if(!r.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function makePrompt(){
  const idea = $("idea").value.trim();
  if(!idea) return setResult("promptResult", `<div class="error">पहले अपना idea लिखें।</div>`);
  setResult("promptResult", `<div class="loading">✨ Prompt बनाया जा रहा है...</div>`);
  try{
    const data = await api("/api/prompt", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({idea})
    });
    setResult("promptResult", `<pre>${escapeHtml(data.prompt)}</pre><button class="secondary" onclick="copyText(${JSON.stringify(data.prompt)})">Copy Prompt</button>`);
  }catch(e){ setResult("promptResult", `<div class="error">${escapeHtml(e.message)}</div>`); }
}

async function generateImage(){
  const prompt = $("generatePrompt").value.trim();
  if(!prompt) return setResult("generateResult", `<div class="error">पहले prompt लिखें।</div>`);
  setResult("generateResult", `<div class="loading">🪄 AI photo generate हो रही है...</div>`);
  try{
    const data = await api("/api/generate", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({prompt,size:$("imageSize").value})
    });
    setResult("generateResult", imageHtml(data.image, "Generated Photo"));
  }catch(e){ setResult("generateResult", `<div class="error">${escapeHtml(e.message)}</div>`); }
}

async function editPhoto(){
  const file = $("photoFile").files[0];
  const prompt = $("editPrompt").value.trim();
  if(!file) return setResult("editResult", `<div class="error">पहले photo चुनें।</div>`);
  setResult("editResult", `<div class="loading">🪄 Photo edit हो रही है...</div>`);
  const fd = new FormData();
  fd.append("image", file); fd.append("prompt", prompt || "Improve this photo naturally while preserving identity and important details.");
  try{
    const data = await api("/api/edit", {method:"POST", body:fd});
    setResult("editResult", imageHtml(data.image, "Edited Photo"));
  }catch(e){ setResult("editResult", `<div class="error">${escapeHtml(e.message)}</div>`); }
}

async function show4kInfo(){
  try{
    const data = await api("/api/upscale-info", {method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
    setResult("upscaleResult", `<div class="notice">${escapeHtml(data.message)}</div>`);
  }catch(e){ setResult("upscaleResult", `<div class="error">${escapeHtml(e.message)}</div>`); }
}

function imageHtml(src, alt){
  return `<img src="${src}" alt="${alt}"><button class="secondary" onclick="downloadImage(${JSON.stringify(src)})">Download Image</button>`;
}
function downloadImage(src){
  const a=document.createElement("a"); a.href=src; a.download="free-ai-photo.png"; a.click();
}
function copyText(t){ navigator.clipboard?.writeText(t); }
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function resetAll(){
  document.querySelectorAll("textarea").forEach(x=>x.value="");
  document.querySelectorAll(".result").forEach(x=>x.innerHTML="");
  $("photoFile").value="";
  $("upscaleFile").value="";
}
