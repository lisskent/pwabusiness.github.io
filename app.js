const KEY="earnings_pwa_v1";
const defaults={settings:{rate:250,boostRate:180},days:{},notes:{},calendar:{}};
let data=load(), mode="shift", paintMode="shift", selectedDate=iso(new Date());

function load(){try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch{return structuredClone(defaults)}}
function save(){localStorage.setItem(KEY,JSON.stringify(data))}
function iso(d){return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)}
function money(n){return Math.round(n).toLocaleString("ru-RU")+" ₽"}
function dateObj(s){const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)}
function monthKey(d=new Date()){return d.toISOString().slice(0,7)}
function monthLabel(d=new Date()){return d.toLocaleDateString("ru-RU",{month:"long",year:"numeric"})}
function toast(t){const x=document.getElementById("toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2200)}
function today(){return iso(new Date())}

function calcShift(){const h=+cashHours().hours,c=+document.getElementById("cash").value||0,n=+document.getElementById("card").value||0;return h*data.settings.rate+(c+n)*.03}
function cashHours(){return {hours:document.getElementById("hours").value||0}}
function calcBoost(){return (+document.getElementById("boostHours").value||0)*data.settings.boostRate}
function updatePreview(){
  const val=mode==="shift"?calcShift():calcBoost();
  document.getElementById("todayEarnings").textContent=money(val);
  document.getElementById("boostRatePreview").textContent=money(data.settings.boostRate)+"/ч";
  document.getElementById("todayBreakdown").textContent=mode==="shift"
    ? `${document.getElementById("hours").value||0} ч × ${money(data.settings.rate)}/ч + 3% от выручки`
    : `${document.getElementById("boostHours").value||0} ч × ${money(data.settings.boostRate)}/ч`;
}
function setMode(m){
 mode=m; document.querySelectorAll(".mode").forEach(b=>b.classList.toggle("active",b.dataset.mode===m));
 document.getElementById("shiftFields").classList.toggle("hidden",m!=="shift");
 document.getElementById("boostFields").classList.toggle("hidden",m!=="boost");
 document.getElementById("formula").textContent=m==="shift"?"часы × ставка + (наличные + безнал) × 3%":"часы × ставка усиления";
 updatePreview();
}
function saveDay(){
 const d=today(), val=mode==="shift"?calcShift():calcBoost();
 if(mode==="shift"){
   data.days[d]={type:"shift",cash:+document.getElementById("cash").value||0,card:+document.getElementById("card").value||0,hours:+document.getElementById("hours").value||0,earnings:val};
 }else{
   data.days[d]={type:"boost",hours:+document.getElementById("boostHours").value||0,earnings:val};
 }
 data.calendar[d]=mode; save(); toast("День сохранён");
 renderAll();
}
function monthDays(){
 const m=monthKey(), out=[];
 Object.entries(data.days).forEach(([d,v])=>{if(d.startsWith(m))out.push([d,v])});
 return out.sort((a,b)=>b[0].localeCompare(a[0]));
}
function renderMonth(){
 const rows=monthDays(), total=rows.reduce((s,[,v])=>s+v.earnings,0), boost=rows.filter(([,v])=>v.type==="boost").reduce((s,[,v])=>s+v.earnings,0), hours=rows.reduce((s,[,v])=>s+v.hours,0);
 document.getElementById("monthName").textContent=monthLabel();
 document.getElementById("monthTotal").textContent=money(total);
 document.getElementById("monthBoost").textContent=money(boost);
 document.getElementById("monthHours").textContent=hours.toLocaleString("ru-RU")+" ч";
 document.getElementById("daysCount").textContent=rows.length;
 document.getElementById("daysList").innerHTML=rows.length?rows.map(([d,v])=>`<div class="day-row"><div class="day-main"><i class="day-mark ${v.type==="boost"?"boost":""}"></i><div><div class="day-date">${dateObj(d).toLocaleDateString("ru-RU",{day:"2-digit",month:"long"})}</div><div class="day-type">${v.type==="boost"?"Усиление":"Смена"} · ${v.hours} ч</div></div></div><div class="day-money">${money(v.earnings)}</div></div>`).join(""):"<div style='padding:20px;text-align:center;color:#999'>В этом месяце пока нет сохранённых дней.</div>";
}
function renderCalendar(){
 const now=new Date(), y=now.getFullYear(), m=now.getMonth(), first=new Date(y,m,1), days=new Date(y,m+1,0).getDate();
 document.getElementById("calendarMonth").textContent=monthLabel(now);
 let start=(first.getDay()+6)%7, html="";
 for(let i=0;i<start;i++)html+='<div class="cal-day empty"></div>';
 for(let day=1;day<=days;day++){
   const d=`${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`, mark=data.calendar[d]||"", v=data.days[d], note=data.notes[d];
   html+=`<button class="cal-day ${mark} ${d===today()?"today":""}" data-date="${d}"><span class="num">${day}</span>${v?`<span class="money">${Math.round(v.earnings)}₽</span>`:""}${note?.text?"<span style='position:absolute;top:3px;right:5px;font-size:8px'>●</span>":""}</button>`;
 }
 document.getElementById("calendarGrid").innerHTML=html;
 document.querySelectorAll(".cal-day[data-date]").forEach(b=>b.onclick=()=>calendarClick(b.dataset.date));
 loadNote(selectedDate);
}
function calendarClick(d){
 selectedDate=d;
 if(paintMode==="erase"){delete data.calendar[d];save();renderCalendar();return}
 data.calendar[d]=paintMode;save();renderCalendar();
}
function loadNote(d){
 const n=data.notes[d]||{};
 document.getElementById("selectedDateLabel").textContent=dateObj(d).toLocaleDateString("ru-RU",{day:"numeric",month:"long"});
 document.getElementById("noteText").value=n.text||"";
 document.getElementById("reminderTime").value=n.time||"";
 document.getElementById("reminderInfo").textContent=n.time?"Напоминание установлено на "+n.time+".":"Для напоминаний разрешите уведомления в браузере.";
}
async function saveNote(){
 const text=document.getElementById("noteText").value.trim(), time=document.getElementById("reminderTime").value;
 if(!text&&!time){delete data.notes[selectedDate];save();renderCalendar();toast("Заметка удалена");return}
 data.notes[selectedDate]={text,time,notified:false};save();
 if(time && "Notification" in window){try{if(Notification.permission==="default")await Notification.requestPermission()}catch{}}
 renderCalendar();toast("Заметка сохранена");
}
function showScreen(s){
 document.querySelectorAll(".screen").forEach(x=>x.classList.toggle("active",x.id===s));
 document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.screen===s));
 if(s==="month")renderMonth(); if(s==="calendar")renderCalendar(); if(s==="settings")loadSettings();
}
function loadSettings(){document.getElementById("hourRate").value=data.settings.rate;document.getElementById("boostRate").value=data.settings.boostRate}
function checkReminders(){
 const d=today(), n=data.notes[d]; if(!n?.time||n.notified)return;
 const now=new Date(), hm=now.toTimeString().slice(0,5);
 if(hm===n.time){n.notified=true;save();if("Notification"in window&&Notification.permission==="granted")new Notification("Напоминание",{body:n.text||"Напоминание на сегодня"});else toast("Напоминание: "+(n.text||"событие"))}
}
function renderAll(){document.getElementById("greeting").textContent=new Date().toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long"});updatePreview();renderMonth();renderCalendar()}

document.querySelectorAll(".mode").forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
document.querySelectorAll("input").forEach(x=>x.addEventListener("input",updatePreview));
document.getElementById("saveBtn").onclick=saveDay;
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>showScreen(b.dataset.screen));
document.getElementById("settingsBtn").onclick=()=>showScreen("settings");
document.querySelectorAll(".paint-btn").forEach(b=>b.onclick=()=>{paintMode=b.dataset.paint;document.querySelectorAll(".paint-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active")});
document.getElementById("saveNoteBtn").onclick=saveNote;
document.getElementById("saveSettingsBtn").onclick=()=>{data.settings.rate=+document.getElementById("hourRate").value||0;data.settings.boostRate=+document.getElementById("boostRate").value||0;save();updatePreview();toast("Настройки сохранены")};
document.getElementById("clearMonthBtn").onclick=()=>{if(confirm("Удалить все данные текущего месяца? Это действие нельзя отменить.")){const m=monthKey();Object.keys(data.days).filter(d=>d.startsWith(m)).forEach(d=>delete data.days[d]);Object.keys(data.notes).filter(d=>d.startsWith(m)).forEach(d=>delete data.notes[d]);Object.keys(data.calendar).filter(d=>d.startsWith(m)).forEach(d=>delete data.calendar[d]);save();renderAll();toast("Данные месяца очищены")}};

if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
renderAll();setInterval(checkReminders,30000);checkReminders();
