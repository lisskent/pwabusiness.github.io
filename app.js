const KEY='earnings_pwa_v15';
const DEFAULT={version:15,user:{name:''},settings:{theme:'light'},activeWorkId:null,works:[],days:{},calendar:{},notes:{},goals:{}};
let data=load(),selectedDate=iso(new Date()),viewMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1),statsMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1),editingDate=null,editingEntryId=null,editingWorkId=null,paintMode=null;
function uid(){return 'id_'+Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
function iso(d){return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)}
function dateObj(s){const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)}
function money(n){return Math.round(Number(n)||0).toLocaleString('ru-RU')+' ₽'}
function pct(n){return (Number(n)||0).toLocaleString('ru-RU',{maximumFractionDigits:1})+'%'}
function monthKey(d=viewMonth){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function monthLabel(d=viewMonth){return d.toLocaleDateString('ru-RU',{month:'long',year:'numeric'})}
function today(){return iso(new Date())}
function toast(t){const x=document.getElementById('toast');x.textContent=t;x.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>x.classList.remove('show'),2200)}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function makeWork(name='Новое место',color='#5b5ce2'){return{id:uid(),name,color,formula:{type:'hour_percent',rate:250,percent:3,fixed:0}}}
function load(){
  try{
    const keys=[KEY,'earnings_pwa_v14','earnings_pwa_v13','earnings_pwa_v12','earnings_pwa_v11','earnings_pwa_v10','earnings_pwa_v3','earnings_pwa_v1'];
    let raw=null;
    for(const k of keys){
      const value=localStorage.getItem(k);
      if(!value) continue;
      try{const parsed=JSON.parse(value); if(parsed&&typeof parsed==='object'){
        const hasUsefulData=Object.keys(parsed.days||{}).length||Object.keys(parsed.calendar||{}).length||Object.keys(parsed.goals||{}).length||((parsed.works||[]).length>1);
        if(!raw||hasUsefulData) raw=parsed;
        if(hasUsefulData) break;
      }}catch{}
    }
    const d=normalize({...DEFAULT,...(raw||{})});
    if(!d.works.length)d.works=[makeWork('Основная работа','#4f67df')];
    d.activeWorkId=d.activeWorkId||d.works[0].id;
    return d;
  }catch{return normalize({...DEFAULT,works:[makeWork('Основная работа','#4f67df')]})}
}

function normalize(d){
  d.user=d.user||{name:''};
  d.settings=d.settings||{}; d.settings.theme=d.settings.theme==='dark'?'dark':'light';
  d.works=Array.isArray(d.works)?d.works:[];
  d.days=d.days||{}; d.calendar=d.calendar||{}; d.notes=d.notes||{}; d.goals=d.goals||{};
  if(d.settings&&!d.works.length&&d.settings.rate){d.works=[{id:'legacy',name:'Основная работа',color:'#4f67df',formula:{type:'hour_percent',rate:+d.settings.rate||250,percent:3,fixed:0}}]}
  if(!d.works.length)d.works=[makeWork('Основная работа','#4f67df')];
  d.works=d.works.map(w=>{w.formula=w.formula||{type:'hour_percent',rate:250,percent:3,fixed:0};w.formula.type=['hour_percent','hourly','percent','fixed'].includes(w.formula.type)?w.formula.type:'hour_percent';w.formula.rate=Number(w.formula.rate)||0;w.formula.percent=Number(w.formula.percent)||0;w.formula.fixed=Number(w.formula.fixed)||0;delete w.formula.boostRate;return w});
  const fallbackWork=d.works[0];
  Object.keys(d.days).forEach(date=>{
    let v=d.days[date];
    let entries;
    if(Array.isArray(v)) entries=v;
    else if(v&&Array.isArray(v.entries)) entries=v.entries;
    else if(v&&typeof v==='object') entries=[v];
    else {delete d.days[date];return}
    entries=entries.filter(Boolean).map(e=>{
      if(!e.id)e.id=uid();
      if(!e.workId)e.workId=fallbackWork.id;
      if(!e.type)e.type='shift';
      const w=d.works.find(x=>x.id===e.workId)||fallbackWork;
      if(e.earnings==null)e.earnings=calc(e,w);
      return e;
    });
    d.days[date]={entries};
  });
  Object.keys(d.calendar).forEach(date=>{
    const v=d.calendar[date];
    if(v==='off')return;
    if(v==='shift'||v==='boost'){
      const day=d.days[date];
      d.calendar[date]=day?.entries?.[0]?.workId?[day.entries[0].workId]:[fallbackWork.id];
    }else if(!Array.isArray(v)){d.calendar[date]=v?[v]:[]}
  });
  return d;
}

function save(){const payload=JSON.stringify(data);localStorage.setItem(KEY,payload);try{const r=indexedDB.open('EarningsTrackerDB',2);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains('state'))db.createObjectStore('state')};r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put({savedAt:Date.now(),data},'current');tx.oncomplete=()=>db.close()}}catch{}}
function work(id){return data.works.find(w=>w.id===id)||data.works[0]}
function activeWork(){return work(data.activeWorkId)}
function calc(v,w=work(v?.workId)){
  if(!v||v.type==='off')return 0;
  const f=v.formulaSnapshot||w?.formula||{},h=Number(v.hours)||0,c=(Number(v.cash)||0)+(Number(v.card)||0);
  if(v.type==='boost')return h*(Number(f.boostRate)||Number(f.rate)||0);
  if(f.type==='hourly')return h*(Number(f.rate)||0);
  if(f.type==='percent')return c*(Number(f.percent)||0)/100;
  if(f.type==='fixed')return Number(f.fixed)||0;
  return h*(Number(f.rate)||0)+c*(Number(f.percent)||0)/100;
}
function earningsOf(e,w){
  if(!e||e.type==='off')return 0;
  const saved=Number(e.earnings);
  if(Number.isFinite(saved)&&saved>0)return saved;
  const snap=e.formulaSnapshot&&typeof e.formulaSnapshot==='object'?e.formulaSnapshot:null;
  if(snap&&snap.type){const n=calc(e,w);if(Number.isFinite(n)&&n!==0)return n;}
  const legacy=e.rateSnapshot&&typeof e.rateSnapshot==='object'?e.rateSnapshot:null;
  if(legacy){const h=+e.hours||0,c=(+e.cash||0)+(+e.card||0),f=w?.formula||{};const rate=+legacy.rate||+f.rate||0,percent=+legacy.percent||+f.percent||0,boostRate=+legacy.boostRate||+f.boostRate||0;return e.type==='boost'?h*boostRate:h*rate+c*percent/100;}
  const n=calc(e,w);return Number.isFinite(n)?n:0;
}
function formulaText(w){const f=w?.formula||{};if(f.type==='hourly')return `часы × ${money(f.rate)}/ч`;if(f.type==='percent')return `выручка × ${pct(f.percent)}`;if(f.type==='fixed')return `фиксированная смена: ${money(f.fixed)}`;return `часы × ${money(f.rate)}/ч + выручка × ${pct(f.percent)}`}
function normalizeDayEntries(day){
  if(!day)return [];
  if(Array.isArray(day.entries))return day.entries.filter(Boolean);
  if(Array.isArray(day))return day.filter(Boolean);
  if(typeof day==='object')return [day];
  return [];
}
function rowsForMonth(d=viewMonth){const m=monthKey(d);return Object.entries(data.days).filter(([k])=>k.startsWith(m)).sort((a,b)=>b[0].localeCompare(a[0]))}
function entriesForMonth(d=viewMonth){const out=[];rowsForMonth(d).forEach(([date,day])=>normalizeDayEntries(day).forEach(e=>{if(!e.workId)e.workId=data.works[0]?.id;if(e.type!=='off')out.push({date,e,w:work(e.workId)});}));return out}
function renderWorkSelects(){const opts=data.works.map(w=>`<option value="${w.id}">${escapeHtml(w.name)}</option>`).join('');document.getElementById('homeWorkSelect').innerHTML=opts;document.getElementById('homeWorkSelect').value=data.activeWorkId||data.works[0]?.id||'';document.getElementById('editWorkSelect').innerHTML=opts;renderHomeFields()}
function renderHomeFields(){const w=activeWork(),f=w?.formula||{},hoursLabel=document.getElementById('hoursLabel'),cash=document.getElementById('cashLabel'),card=document.getElementById('cardLabel');loadTodayEntry(w?.id);document.getElementById('workFormulaPreview').textContent=formulaText(w);document.getElementById('ratePreview').textContent=f.type==='fixed'?money(f.fixed):f.type==='percent'?pct(f.percent):money(f.rate)+'/ч';cash.classList.toggle('hidden',f.type==='hourly');card.classList.toggle('hidden',f.type==='hourly');hoursLabel.classList.toggle('hidden',f.type==='percent'||f.type==='fixed');document.getElementById('fixedInfo').classList.toggle('hidden',f.type!=='fixed');updatePreview()}
function previewEntry(){const w=activeWork(),f=w?.formula||{},v={type:'shift',workId:w?.id,cash:+document.getElementById('cash').value||0,card:+document.getElementById('card').value||0,hours:+document.getElementById('hours').value||0,formulaSnapshot:f};return calc(v,w)}
function loadTodayEntry(workId){const es=normalizeDayEntries(data.days[today()]);const e=es.find(x=>x.workId===workId&&x.type!=='off');const ids=['cash','card','hours'];if(e){document.getElementById('cash').value=e.cash??'';document.getElementById('card').value=e.card??'';document.getElementById('hours').value=e.hours??'';}else ids.forEach(id=>document.getElementById(id).value='');return e}
function updatePreview(){const w=activeWork();if(!w)return;document.getElementById('todayEarnings').textContent=money(previewEntry());document.getElementById('todayBreakdown').textContent=formulaText(w);document.getElementById('formula').textContent=`${w.name}: ${formulaText(w)}`}
function saveToday(){const w=activeWork();if(!w)return;const d=today(),day=data.days[d]||(data.days[d]={entries:[]}),entries=normalizeDayEntries(day);let same=entries.filter(e=>e.workId===w.id&&e.type!=='off');let entry=same[0]||{id:uid()};Object.assign(entry,{type:'shift',workId:w.id,cash:+document.getElementById('cash').value||0,card:+document.getElementById('card').value||0,hours:+document.getElementById('hours').value||0,formulaSnapshot:{...w.formula}});entry.earnings=calc(entry,w);day.entries=entries.filter(e=>e!==entry&&!same.includes(e));day.entries.push(entry);data.calendar[d]=data.calendar[d]||[w.id];if(!Array.isArray(data.calendar[d]))data.calendar[d]=data.calendar[d]==='off'?[w.id]:[data.calendar[d]];if(!data.calendar[d].includes(w.id))data.calendar[d].push(w.id);save();renderAll();toast('День сохранён') }
function renderMonth(){document.getElementById('monthName').textContent=monthLabel();const es=entriesForMonth(),total=es.reduce((s,x)=>s+earningsOf(x.e,x.w),0),hours=es.reduce((s,x)=>s+(+x.e.hours||0),0),days=new Set(es.map(x=>x.date)),avg=days.size?total/days.size:0,ah=hours?total/hours:0;document.getElementById('monthTotal').textContent=money(total);document.getElementById('monthHours').textContent=hours.toLocaleString('ru-RU')+' ч';document.getElementById('monthWorkDays').textContent=days.size;document.getElementById('monthAvgDay').textContent=money(avg);document.getElementById('monthAvgHour').textContent=money(ah);document.getElementById('daysCount').textContent=days.size;const dayMap={};es.forEach(x=>(dayMap[x.date]??=[]).push(x));document.getElementById('daysList').innerHTML=Object.keys(dayMap).sort((a,b)=>b.localeCompare(a)).map(d=>{const list=dayMap[d],sum=list.reduce((s,x)=>s+earningsOf(x.e,x.w),0);return `<div class="day-row" data-edit="${d}"><div class="day-main"><div class="day-date">${dateObj(d).toLocaleDateString('ru-RU',{day:'2-digit',month:'long'})}</div><div class="day-type">${list.map(x=>`<span class="work-pill" style="--c:${x.w?.color||'#777'}">${escapeHtml(x.w?.name||'Работа')}</span>`).join(' ')} · ${list.reduce((s,x)=>s+(+x.e.hours||0),0)} ч</div></div><div class="day-money">${money(sum)}</div></div>`}).join('')||'<div style="padding:20px;text-align:center;color:#999">Нет записей за этот месяц.</div>';document.querySelectorAll('[data-edit]').forEach(x=>x.onclick=()=>openDayEditor(x.dataset.edit));renderGoal();renderForecast();renderWorkBreakdown()}
function renderWorkBreakdown(){const box=document.getElementById('workBreakdown');if(!box)return;const map={};entriesForMonth().forEach(x=>map[x.e.workId]=(map[x.e.workId]||0)+earningsOf(x.e,x.w));box.innerHTML=Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([id,n])=>{const w=work(id);return `<div class="break-row"><i style="background:${w?.color||'#777'}"></i><span>${escapeHtml(w?.name||'Работа')}</span><b>${money(n)}</b></div>`}).join('')||'<div class="muted">Нет данных</div>'}
function renderGoal(){const m=monthKey(),g=+data.goals[m]||0,total=entriesForMonth().reduce((s,x)=>s+earningsOf(x.e,x.w),0);document.getElementById('goalValue').textContent=g?money(g):'Не задана';const p=g?Math.min(100,total/g*100):0;document.getElementById('goalProgress').style.width=p+'%';document.getElementById('goalHint').textContent=g?`${money(total)} из ${money(g)} · ${Math.round(p)}%`:'Поставьте цель по заработку'}
function expectedForWork(workId,month){const same=entriesForMonth(month).filter(x=>x.e.workId===workId), hist=Object.entries(data.days).flatMap(([date,day])=>(day.entries||[]).filter(e=>e.workId===workId).map(e=>({date,e,w:work(workId)})));const src=same.length?same:hist;return src.length?src.reduce((s,x)=>s+earningsOf(x.e,x.w),0)/src.length:0}
function renderForecast(){const now=new Date(),same=now.getFullYear()===viewMonth.getFullYear()&&now.getMonth()===viewMonth.getMonth(),actual=entriesForMonth().filter(x=>x.date<=today()),actualTotal=actual.reduce((s,x)=>s+earningsOf(x.e,x.w),0),future=[];if(same){const daysIn=new Date(viewMonth.getFullYear(),viewMonth.getMonth()+1,0).getDate();for(let day=now.getDate()+1;day<=daysIn;day++){const d=`${viewMonth.getFullYear()}-${String(viewMonth.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`,marks=Array.isArray(data.calendar[d])?data.calendar[d]:data.calendar[d]&&data.calendar[d]!=='off'?[data.calendar[d]]:[];if(marks.length)marks.filter(id=>id!=='off').forEach(id=>future.push({d,id,expected:expectedForWork(id,viewMonth)}))}}const forecast=actualTotal+future.reduce((s,x)=>s+x.expected,0);document.getElementById('forecastValue').textContent=money(forecast);if(!same)document.getElementById('forecastText').textContent='Прогноз рассчитывается только для текущего месяца.';else if(!future.length)document.getElementById('forecastText').textContent='Нет будущих рабочих дней в календаре.';else document.getElementById('forecastText').textContent=`Учтено ${future.length} отмеч. смен · ожидаемо ${money(future.reduce((s,x)=>s+x.expected,0))}.`}
function renderCalendar(){const y=viewMonth.getFullYear(),m=viewMonth.getMonth(),first=new Date(y,m,1),days=new Date(y,m+1,0).getDate();document.getElementById('calendarMonth').textContent=monthLabel();let start=(first.getDay()+6)%7,html='';for(let i=0;i<start;i++)html+='<div class="cal-day empty"></div>';for(let day=1;day<=days;day++){const d=`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`,marks=Array.isArray(data.calendar[d])?data.calendar[d]:data.calendar[d]&&data.calendar[d]!=='off'?[data.calendar[d]]:[],off=data.calendar[d]==='off',entries=normalizeDayEntries(data.days[d]),sum=entries.reduce((s,e)=>s+earningsOf(e,work(e.workId)),0),colors=marks.filter(x=>x!=='off').map(id=>work(id)?.color).filter(Boolean);html+=`<button class="cal-day ${off?'off':''} ${d===today()?'today':''} ${d===selectedDate?'selected':''}" data-date="${d}"><span class="num">${day}</span><span class="mark-dots">${colors.slice(0,3).map(c=>`<i style="background:${c}"></i>`).join('')}</span>${sum?`<span class="money">${Math.round(sum)}₽</span>`:''}${data.notes[d]?.text?'<span class="note-dot">●</span>':''}</button>`}document.getElementById('calendarGrid').innerHTML=html;document.querySelectorAll('.cal-day[data-date]').forEach(b=>b.onclick=()=>calendarClick(b.dataset.date));loadNote(selectedDate);updatePaintUI()}
function calendarClick(d){selectedDate=d;if(paintMode){if(paintMode!=='off' && d<=today()){let marks=Array.isArray(data.calendar[d])?data.calendar[d]:data.calendar[d]&&data.calendar[d]!=='off'?[data.calendar[d]]:[];if(!marks.includes(paintMode)){if(data.calendar[d]==='off')marks=[];marks.push(paintMode);data.calendar[d]=marks;save();}const existing=normalizeDayEntries(data.days[d]).find(e=>e.workId===paintMode&&e.type!=='off');loadNote(d);openDayEditor(d,existing?.id||null,paintMode);return}let message='';if(paintMode==='off'){const was=data.calendar[d]==='off';data.calendar[d]=was?[]:'off';message=was?'Выходной снят':'День отмечен как выходной'}else{let marks=Array.isArray(data.calendar[d])?data.calendar[d]:data.calendar[d]&&data.calendar[d]!=='off'?[data.calendar[d]]:[];if(marks.includes(paintMode)){marks=marks.filter(x=>x!==paintMode);message=`${work(paintMode)?.name||'Работа'} снята с календаря`}else{if(data.calendar[d]==='off')marks=[];marks.push(paintMode);message=`${work(paintMode)?.name||'Работа'} добавлена в календарь`}data.calendar[d]=marks}save();renderAll();toast(message);return}loadNote(d);openDayEditor(d)}
function setPaintMode(m){paintMode=paintMode===m?null:m;updatePaintUI();document.getElementById('paintHint').textContent=paintMode?`Планирование: ${m==='off'?'Выходной':work(m)?.name||'работа'}. Нажмите ещё раз для отключения.`:'Режим выключен. Нажмите дату для просмотра или редактирования.'}
function updatePaintUI(){document.querySelectorAll('.paint-btn').forEach(b=>b.classList.toggle('active',b.dataset.paint===paintMode));const box=document.getElementById('paintWorkButtons');if(box){box.innerHTML=data.works.map(w=>`<button class="paint-btn" data-paint="${w.id}" style="--paint:${w.color}">${escapeHtml(w.name)}</button>`).join('')+'<button class="paint-btn off-paint" data-paint="off">Выходной</button>';box.querySelectorAll('.paint-btn').forEach(b=>b.onclick=()=>setPaintMode(b.dataset.paint));box.querySelectorAll('.paint-btn').forEach(b=>b.classList.toggle('active',b.dataset.paint===paintMode))}}
function loadNote(d){selectedDate=d;const n=data.notes[d]||{};document.getElementById('selectedDateLabel').textContent=dateObj(d).toLocaleDateString('ru-RU',{day:'numeric',month:'long'});document.getElementById('noteText').value=n.text||'';document.getElementById('reminderTime').value=n.time||'';document.getElementById('reminderInfo').textContent=n.time?'Напоминание: '+n.time:''}
function saveNote(){const text=document.getElementById('noteText').value.trim(),time=document.getElementById('reminderTime').value;if(text||time)data.notes[selectedDate]={text,time};else delete data.notes[selectedDate];save();renderCalendar();toast('Заметка сохранена')}
function openDayEditor(d,entryId=null,preferredWorkId=null){editingDate=d;editingEntryId=entryId;const day=data.days[d],entries=normalizeDayEntries(day);const e=entryId?entries.find(x=>x.id===entryId):(preferredWorkId?entries.find(x=>x.workId===preferredWorkId&&x.type!=='off'):entries[0]);const w=work(e?.workId||preferredWorkId||data.activeWorkId);document.getElementById('modalTitle').textContent=`${dateObj(d).toLocaleDateString('ru-RU',{day:'numeric',month:'long'})}`;renderEntryList(d);document.getElementById('editWorkSelect').value=w?.id||'';fillEditor(e,w);document.getElementById('dayModal').classList.remove('hidden')}
function renderEntryList(d){const box=document.getElementById('entryList');if(!box)return;const es=normalizeDayEntries(data.days[d]);box.innerHTML=es.map(e=>{const w=work(e.workId);return `<button class="entry-chip ${e.id===editingEntryId?'active':''}" data-entry="${e.id}"><i style="background:${w?.color||'#777'}"></i>${escapeHtml(w?.name||'Работа')} · ${money(calc(e,w))}</button>`}).join('')+'<button class="entry-chip add-entry" data-entry="new">＋ Добавить работу</button>';box.querySelectorAll('[data-entry]').forEach(b=>b.onclick=()=>{if(b.dataset.entry==='new'){editingEntryId=null;const w=activeWork();document.getElementById('editWorkSelect').value=w.id;fillEditor(null,w)}else openDayEditor(d,b.dataset.entry)})}
function fillEditor(e,w){document.querySelectorAll('.modal-type').forEach(b=>b.classList.toggle('active',b.dataset.type===(e?.type||'shift')));document.getElementById('editCash').value=e?.cash??'';document.getElementById('editCard').value=e?.card??'';document.getElementById('editHours').value=e?.hours??'';document.getElementById('editBoostHours').value=e?.hours??'';updateEditPreview()}
function updateEditPreview(){const w=work(document.getElementById('editWorkSelect').value),type=document.querySelector('.modal-type.active')?.dataset.type||'shift',v={type,workId:w?.id,cash:+document.getElementById('editCash').value||0,card:+document.getElementById('editCard').value||0,hours:type==='boost'?+document.getElementById('editBoostHours').value||0:+document.getElementById('editHours').value||0,formulaSnapshot:w?.formula};document.getElementById('modalShift').classList.toggle('hidden',type!=='shift');document.getElementById('modalBoost').classList.toggle('hidden',type!=='boost');document.getElementById('editFormula').textContent=w?formulaText(w):'';document.getElementById('editEarningsPreview').textContent=money(calc(v,w))}
function saveDayEdit(){const d=editingDate,w=work(document.getElementById('editWorkSelect').value),type=document.querySelector('.modal-type.active')?.dataset.type||'shift';data.days[d] ||= {entries:[]};let e=editingEntryId?data.days[d].entries.find(x=>x.id===editingEntryId):null;if(!e){e={id:uid()};data.days[d].entries.push(e)}Object.assign(e,{type,workId:w.id,cash:+document.getElementById('editCash').value||0,card:+document.getElementById('editCard').value||0,hours:type==='boost'?+document.getElementById('editBoostHours').value||0:+document.getElementById('editHours').value||0,formulaSnapshot:{...w.formula}});e.earnings=calc(e,w);if(type==='off'){data.days[d].entries=data.days[d].entries.filter(x=>x.id!==e.id);data.calendar[d]='off'}else{let marks=Array.isArray(data.calendar[d])?data.calendar[d]:[];if(!marks.includes(w.id))marks.push(w.id);data.calendar[d]=marks}if(!data.days[d].entries.length)delete data.days[d];save();closeModal();renderAll();toast('День сохранён')}
function setEditType(t){document.querySelectorAll('.modal-type').forEach(b=>b.classList.toggle('active',b.dataset.type===t));updateEditPreview()}
function deleteDay(){if(!editingDate)return;const d=editingDate;if(editingEntryId){data.days[d].entries=(data.days[d].entries||[]).filter(e=>e.id!==editingEntryId);if(!data.days[d].entries.length)delete data.days[d]}else delete data.days[d];save();closeModal();renderAll();toast('Запись удалена')}
function closeModal(){document.getElementById('dayModal').classList.add('hidden');editingDate=null;editingEntryId=null}
function shiftMonth(delta){viewMonth=new Date(viewMonth.getFullYear(),viewMonth.getMonth()+delta,1);renderMonth();renderCalendar()}
function shiftStats(delta){statsMonth=new Date(statsMonth.getFullYear(),statsMonth.getMonth()+delta,1);renderStats()}
function statsEntries(monthDate){
  const prefix=`${monthDate.getFullYear()}-${String(monthDate.getMonth()+1).padStart(2,'0')}-`;
  const out=[];
  Object.keys(data.days||{}).forEach(date=>{
    if(!date.startsWith(prefix))return;
    normalizeDayEntries(data.days[date]).forEach(e=>{
      if(!e||e.type==='off')return;
      const w=work(e.workId);
      let n=Number(e.earnings);
      if(!Number.isFinite(n)||n<0)n=Number(calc(e,w))||0;
      const revenue=(Number(e.cash)||0)+(Number(e.card)||0);
      out.push({date,e,w,n,revenue,hours:Number(e.hours)||0});
    });
  });
  return out;
}
function renderStats(){
  try{
    const title=document.getElementById('statsMonth');if(title)title.textContent=monthLabel(statsMonth);
    const es=statsEntries(statsMonth),byDay={};
    es.forEach(x=>{(byDay[x.date]??=[]).push(x)});
    const vals=Object.entries(byDay).sort((a,b)=>a[0].localeCompare(b[0])).map(([date,list])=>({d:date,n:list.reduce((s,x)=>s+x.n,0),revenue:list.reduce((s,x)=>s+x.revenue,0),hours:list.reduce((s,x)=>s+x.hours,0)}));
    const max=Math.max(1,...vals.map(x=>x.n));
    const bars=document.getElementById('bars');
    if(bars){
      bars.innerHTML=vals.length?vals.map(x=>{const h=Math.max(4,(x.n/max)*100);return `<button class=\"bar-wrap\" data-stat-date=\"${x.d}\" type=\"button\" title=\"${dateObj(x.d).toLocaleDateString('ru-RU',{day:'numeric',month:'short'})}: ${money(x.n)}\"><span class=\"bar-value\">${money(x.n)}</span><span class=\"bar\" style=\"height:${h}%\"></span><small>${dateObj(x.d).getDate()}</small></button>`}).join(''):'<div style=\"color:#999;margin:auto\">Нет данных за этот месяц</div>';
      bars.querySelectorAll('[data-stat-date]').forEach(b=>b.onclick=()=>{const x=vals.find(v=>v.d===b.dataset.statDate);if(x)toast(`${dateObj(x.d).toLocaleDateString('ru-RU',{day:'numeric',month:'long'})}: ${money(x.n)} · выручка ${money(x.revenue)}`)});
    }
    const total=vals.reduce((s,x)=>s+x.n,0);
    const hours=vals.reduce((s,x)=>s+x.hours,0);
    const days=vals.length;
    const best=vals.length?vals.reduce((a,b)=>b.n>a.n?b:a):null;
    const commission=es.reduce((s,x)=>{const f=x.e.formulaSnapshot||x.w?.formula||{};return s+((x.revenue)*(Number(f.type==='hour_percent'||f.type==='percent'?f.percent:0)||0)/100)},0);
    const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
    set('bestDay',best?`${dateObj(best.d).toLocaleDateString('ru-RU',{day:'numeric',month:'long'})} · ${money(best.n)}`:'—');
    set('bestDayLabel',best?money(best.n):'—');
    set('avgShift',money(days?total/days:0));
    set('avgHour',money(hours?total/hours:0));
    set('commissionTotal',money(commission));
    const wb=document.getElementById('statsWorkBreakdown');
    if(wb){const map={};es.forEach(x=>map[x.w?.id]=(map[x.w?.id]||0)+x.n);wb.innerHTML=Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([id,n])=>{const w=work(id);return `<div class=\"break-row\"><i style=\"background:${w?.color||'#777'}\"></i><span>${escapeHtml(w?.name||'Работа')}</span><b>${money(n)}</b></div>`}).join('')||'<div class=\"muted\">Нет данных</div>'}
  }catch(err){
    console.error('Stats render error',err);
    const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
    set('bestDay','Ошибка расчёта');set('bestDayLabel','Ошибка');set('avgShift','0 ₽');set('avgHour','0 ₽');set('commissionTotal','0 ₽');
  }
}
function renderWorkList(){document.getElementById('workList').innerHTML=data.works.map(w=>`<div class="work-row"><i class="work-color" style="background:${w.color}"></i><div class="work-info"><b>${escapeHtml(w.name)}</b><small>${escapeHtml(formulaText(w))}</small></div><button data-work-edit="${w.id}">Изменить</button></div>`).join('');document.querySelectorAll('[data-work-edit]').forEach(b=>b.onclick=()=>openWorkEditor(b.dataset.workEdit));updatePaintUI()}
function updateFormulaFields(){
  const type=document.getElementById('formulaType')?.value||'hour_percent';
  document.getElementById('formulaRateField')?.classList.toggle('hidden',!['hour_percent','hourly'].includes(type));
  document.getElementById('formulaPercentField')?.classList.toggle('hidden',!['hour_percent','percent'].includes(type));
  document.getElementById('formulaFixedField')?.classList.toggle('hidden',type!=='fixed');
}
function openWorkEditor(id=null){editingWorkId=id;const w=id?work(id):makeWork();document.getElementById('workModalTitle').textContent=id?'Изменить место':'Новое место';document.getElementById('workName').value=w.name;document.getElementById('workColor').value=w.color;document.getElementById('formulaType').value=w.formula.type;document.getElementById('formulaRate').value=w.formula.rate??'';document.getElementById('formulaPercent').value=w.formula.percent??'';document.getElementById('formulaFixed').value=w.formula.fixed??'';document.getElementById('deleteWorkBtn').classList.toggle('hidden',!id);updateFormulaFields();document.getElementById('workModal').classList.remove('hidden')}
function saveWork(){const name=document.getElementById('workName').value.trim()||'Без названия',type=document.getElementById('formulaType').value,f={type,rate:+document.getElementById('formulaRate').value||0,percent:+document.getElementById('formulaPercent').value||0,fixed:+document.getElementById('formulaFixed').value||0},color=document.getElementById('workColor').value;if(editingWorkId){Object.assign(work(editingWorkId),{name,color,formula:f})}else{const w={...makeWork(name,color),name,color,formula:f};data.works.push(w);data.activeWorkId=w.id}save();closeWorkModal();renderAll();toast('Место работы сохранено')}
function deleteWork(){if(!editingWorkId||data.works.length<=1)return toast('Нужно оставить хотя бы одно место работы');if(!confirm('Удалить место работы? История записей останется.'))return;data.works=data.works.filter(w=>w.id!==editingWorkId);data.activeWorkId=data.works[0].id;save();closeWorkModal();renderAll();toast('Место удалено')}
function closeWorkModal(){document.getElementById('workModal').classList.add('hidden');editingWorkId=null}
function openGoal(){document.getElementById('goalInput').value=data.goals[monthKey()]||'';document.getElementById('goalModal').classList.remove('hidden')}
function saveGoal(){const v=+document.getElementById('goalInput').value||0;if(v)data.goals[monthKey()]=v;else delete data.goals[monthKey()];save();document.getElementById('goalModal').classList.add('hidden');renderMonth();toast(v?'Цель сохранена':'Цель удалена')}
function exportData(){const payload={app:'Мой заработок',version:11,exportedAt:new Date().toISOString(),data};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`moj-zarabotok-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Резервная копия создана')}
function importData(file){const r=new FileReader();r.onload=()=>{try{const p=JSON.parse(r.result),d=normalize(p.data||p);if(!d.works.length)throw 0;if(!confirm('Импорт полностью заменит текущие данные. Продолжить?'))return;data=d;save();renderAll();toast('Данные импортированы')}catch{toast('Не удалось импортировать файл')}};r.readAsText(file)}
function clearMonth(){if(!confirm(`Удалить все данные за ${monthLabel()}? Это нельзя отменить.`))return;const m=monthKey();Object.keys(data.days).filter(d=>d.startsWith(m)).forEach(d=>delete data.days[d]);Object.keys(data.notes).filter(d=>d.startsWith(m)).forEach(d=>delete data.notes[d]);Object.keys(data.calendar).filter(d=>d.startsWith(m)).forEach(d=>delete data.calendar[d]);delete data.goals[m];save();renderAll();toast('Данные месяца очищены')}
function showScreen(s){document.querySelectorAll('.screen').forEach(x=>x.classList.toggle('active',x.id===s));document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.screen===s));if(s==='month')renderMonth();if(s==='calendar')renderCalendar();if(s==='stats')renderStats();if(s==='settings')renderSettings()}
function applyTheme(){const dark=data.settings.theme==='dark';document.documentElement.classList.toggle('dark',dark);document.body.classList.toggle('dark',dark);const meta=document.querySelector('meta[name=theme-color]');if(meta)meta.content=dark?'#11121a':'#5865e8';const b=document.getElementById('themeToggle');if(b)b.textContent=dark?'☀️ Светлая тема':'🌙 Тёмная тема'}
function toggleTheme(){data.settings.theme=data.settings.theme==='dark'?'light':'dark';save();applyTheme();toast(data.settings.theme==='dark'?'Тёмная тема включена':'Светлая тема включена')}
function renderSettings(){renderWorkList();document.getElementById('userName').value=data.user.name||'';applyTheme()}
function renderAll(){applyTheme();document.getElementById('greeting').textContent=data.user.name?`Привет, ${data.user.name}`:new Date().toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'});renderWorkSelects();renderMonth();renderCalendar();renderStats();renderSettings()}
document.getElementById('homeWorkSelect').onchange=e=>{data.activeWorkId=e.target.value;save();renderHomeFields()};document.getElementById('themeToggle').onclick=toggleTheme;document.getElementById('addWorkQuick').onclick=()=>openWorkEditor();document.querySelectorAll('#home input').forEach(x=>x.oninput=updatePreview);document.getElementById('saveBtn').onclick=saveToday;document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>showScreen(b.dataset.screen));document.getElementById('settingsBtn').onclick=()=>showScreen('settings');document.getElementById('saveNoteBtn').onclick=saveNote;document.getElementById('editSelectedBtn').onclick=()=>openDayEditor(selectedDate);document.getElementById('monthPrev').onclick=()=>shiftMonth(-1);document.getElementById('monthNext').onclick=()=>shiftMonth(1);document.getElementById('calPrev').onclick=()=>shiftMonth(-1);document.getElementById('calNext').onclick=()=>shiftMonth(1);document.getElementById('statsPrev').onclick=()=>shiftStats(-1);document.getElementById('statsNext').onclick=()=>shiftStats(1);document.getElementById('goalBtn').onclick=openGoal;document.getElementById('saveGoalBtn').onclick=saveGoal;document.getElementById('clearGoalBtn').onclick=()=>{delete data.goals[monthKey()];save();document.getElementById('goalModal').classList.add('hidden');renderMonth()};document.getElementById('closeGoalModal').onclick=()=>document.getElementById('goalModal').classList.add('hidden');document.querySelector('#goalModal .modal-backdrop').onclick=()=>document.getElementById('goalModal').classList.add('hidden');document.querySelectorAll('.modal-type').forEach(b=>b.onclick=()=>setEditType(b.dataset.type));document.getElementById('editWorkSelect').onchange=updateEditPreview;['editCash','editCard','editHours','editBoostHours'].forEach(id=>document.getElementById(id).oninput=updateEditPreview);document.getElementById('saveDayEdit').onclick=saveDayEdit;document.getElementById('deleteDayBtn').onclick=deleteDay;document.getElementById('closeModal').onclick=closeModal;document.querySelector('#dayModal .modal-backdrop').onclick=closeModal;document.getElementById('addWorkBtn').onclick=()=>openWorkEditor();document.getElementById('saveWorkBtn').onclick=saveWork;document.getElementById('formulaType').onchange=updateFormulaFields;document.getElementById('deleteWorkBtn').onclick=deleteWork;document.getElementById('closeWorkModal').onclick=closeWorkModal;document.querySelector('#workModal .modal-backdrop').onclick=closeWorkModal;document.getElementById('saveProfileBtn').onclick=()=>{data.user.name=document.getElementById('userName').value.trim();save();renderAll();toast('Профиль сохранён')};document.getElementById('exportBtn').onclick=exportData;document.getElementById('importBtn').onclick=()=>document.getElementById('importFile').click();document.getElementById('importFile').onchange=e=>{if(e.target.files[0])importData(e.target.files[0]);e.target.value=''};document.getElementById('clearMonthBtn').onclick=clearMonth;
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
function restoreFromIndexedDB(){try{const r=indexedDB.open('EarningsTrackerDB',2);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains('state'))db.createObjectStore('state')};r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readonly'),req=tx.objectStore('state').get('current');req.onsuccess=()=>{const saved=req.result;if(saved?.data){const restored=normalize(saved.data);const localUseful=Object.keys(data.days||{}).length+Object.keys(data.calendar||{}).length;const restoredUseful=Object.keys(restored.days||{}).length+Object.keys(restored.calendar||{}).length;if(restoredUseful>=localUseful){data=restored;data.activeWorkId=data.activeWorkId||data.works[0]?.id;localStorage.setItem(KEY,JSON.stringify(data));renderAll()}}};tx.oncomplete=()=>db.close()}}catch{}}
renderAll();
restoreFromIndexedDB();
