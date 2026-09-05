const KEY='earnings_pwa_v22';
const DEFAULT={version:21,user:{name:''},settings:{theme:'light'},activeWorkId:null,works:[],days:{},calendar:{},notes:{},goals:{}};
let data=load(),selectedDate=iso(new Date()),viewMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1),statsMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1),editingDate=null,editingEntryId=null,editingWorkId=null,paintMode=null;
function uid(){return 'id_'+Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
function iso(d){return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)}
function dateObj(s){const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)}
function money(n){return Math.round(Number(n)||0).toLocaleString('ru-RU')+' ₽'}
function pct(n){return (Number(n)||0).toLocaleString('ru-RU',{maximumFractionDigits:1})+'%'}
function numVal(id){const el=document.getElementById(id);if(!el)return 0;const raw=String(el.value??'').replace(/\s/g,'').replace(',','.');const n=Number(raw);return Number.isFinite(n)?n:0}
function formatMoneyInput(el){if(!el||el.value==='')return;const n=Number(String(el.value).replace(/\s/g,'').replace(',','.'));if(!Number.isFinite(n))return;el.value=n.toLocaleString('ru-RU',{maximumFractionDigits:2,useGrouping:true})}
function clearMoneyInput(el){if(!el)return;el.value=String(el.value).replace(/\s/g,'').replace(',','.') }
function haptic(kind='light'){try{if(navigator.vibrate)navigator.vibrate(kind==='success'?[10,25,10]:kind==='error'?[35,20,35]:10)}catch{}}
function fieldError(id,msg){const el=document.getElementById(id);if(!el)return false;el.classList.toggle('input-error',!!msg);let e=el.parentElement?.querySelector('.field-error');if(msg){if(!e){e=document.createElement('small');e.className='field-error';el.parentElement.appendChild(e)}e.textContent=msg}else if(e)e.remove();return !!msg}
function clearFieldErrors(){document.querySelectorAll('.input-error').forEach(e=>e.classList.remove('input-error'));document.querySelectorAll('.field-error').forEach(e=>e.remove())}
function validateHome(){clearFieldErrors();const w=activeWork(),f=w?.formula||{};if(!w)return false;let bad=false;const hours=numVal('hours'),cash=numVal('cash'),card=numVal('card');if(hours<0||hours>24){fieldError('hours','Введите часы от 0 до 24');bad=true}if(cash<0){fieldError('cash','Сумма не может быть отрицательной');bad=true}if(card<0){fieldError('card','Сумма не может быть отрицательной');bad=true}if(f.type==='hour_percent'||f.type==='hourly')if(!Number.isFinite(hours)){fieldError('hours','Введите корректное число');bad=true}return !bad}
function hideLoading(){const el=document.getElementById('loadingOverlay');if(el){el.classList.add('loaded');setTimeout(()=>el.classList.add('hidden'),260)}}
function monthKey(d=viewMonth){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function monthLabel(d=viewMonth){return d.toLocaleDateString('ru-RU',{month:'long',year:'numeric'})}
function today(){return iso(new Date())}
function toast(t){const x=document.getElementById('toast');x.textContent=t;x.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>x.classList.remove('show'),2200)}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function makeWork(name='Новое место',color='#5b5ce2'){return{id:uid(),name,color,formula:{type:'hour_percent',rate:250,percent:3,fixed:0}}}
function load(){
  try{
    const keys=[KEY,'earnings_pwa_v21','earnings_pwa_v20','earnings_pwa_v19','earnings_pwa_v18','earnings_pwa_v17','earnings_pwa_v16','earnings_pwa_v14','earnings_pwa_v13','earnings_pwa_v12','earnings_pwa_v11','earnings_pwa_v10','earnings_pwa_v3','earnings_pwa_v1'];
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
  d.version=21;
  d.user=d.user||{name:''};
  d.settings=d.settings||{}; d.settings.theme=d.settings.theme==='dark'?'dark':'light';
  d.works=Array.isArray(d.works)?d.works:[];
  d.days=d.days||{}; d.calendar=d.calendar||{}; d.notes=d.notes||{}; d.goals=d.goals||{}; d.budgets=d.budgets||{};
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
function previewEntry(){const w=activeWork(),f=w?.formula||{},v={type:'shift',workId:w?.id,cash:numVal('cash'),card:numVal('card'),hours:numVal('hours'),formulaSnapshot:f};return calc(v,w)}
function loadTodayEntry(workId){const es=normalizeDayEntries(data.days[today()]);const e=es.find(x=>x.workId===workId&&x.type!=='off');const ids=['cash','card','hours'];if(e){document.getElementById('cash').value=e.cash??'';document.getElementById('card').value=e.card??'';document.getElementById('hours').value=e.hours??'';}else ids.forEach(id=>document.getElementById(id).value='');return e}
function updatePreview(){const w=activeWork();if(!w)return;document.getElementById('todayEarnings').textContent=money(previewEntry());document.getElementById('todayBreakdown').textContent=formulaText(w);document.getElementById('formula').textContent=`${w.name}: ${formulaText(w)}`}
function saveToday(){const w=activeWork();if(!w)return;if(!validateHome()){haptic('error');toast('Проверьте поля ввода');return}haptic('success');const d=today(),day=data.days[d]||(data.days[d]={entries:[]}),entries=normalizeDayEntries(day);let same=entries.filter(e=>e.workId===w.id&&e.type!=='off');let entry=same[0]||{id:uid()};Object.assign(entry,{type:'shift',workId:w.id,cash:numVal('cash'),card:numVal('card'),hours:numVal('hours'),formulaSnapshot:{...w.formula}});entry.earnings=calc(entry,w);day.entries=entries.filter(e=>e!==entry&&!same.includes(e));day.entries.push(entry);data.calendar[d]=data.calendar[d]||[w.id];if(!Array.isArray(data.calendar[d]))data.calendar[d]=data.calendar[d]==='off'?[w.id]:[data.calendar[d]];if(!data.calendar[d].includes(w.id))data.calendar[d].push(w.id);save();const btn=document.getElementById('saveBtn');btn.classList.add('saving');btn.disabled=true;btn.innerHTML='<span class=\"save-spinner\"></span> Сохраняем…';setTimeout(()=>{btn.classList.remove('saving');btn.disabled=false;btn.textContent='Сохранить день'},420);renderAll();toast('День сохранён ✓') }
function renderMonth(){document.getElementById('monthName').textContent=monthLabel();const es=entriesForMonth(),total=es.reduce((s,x)=>s+earningsOf(x.e,x.w),0),hours=es.reduce((s,x)=>s+(+x.e.hours||0),0),days=new Set(es.map(x=>x.date)),avg=days.size?total/days.size:0,ah=hours?total/hours:0;document.getElementById('monthTotal').textContent=money(total);document.getElementById('monthHours').textContent=hours.toLocaleString('ru-RU')+' ч';document.getElementById('monthWorkDays').textContent=days.size;document.getElementById('monthAvgDay').textContent=money(avg);document.getElementById('monthAvgHour').textContent=money(ah);document.getElementById('daysCount').textContent=days.size;const dayMap={};es.forEach(x=>(dayMap[x.date]??=[]).push(x));document.getElementById('daysList').innerHTML=Object.keys(dayMap).sort((a,b)=>b.localeCompare(a)).map(d=>{const list=dayMap[d],sum=list.reduce((s,x)=>s+earningsOf(x.e,x.w),0);return `<div class="day-row" data-edit="${d}"><div class="day-main"><div class="day-date">${dateObj(d).toLocaleDateString('ru-RU',{day:'2-digit',month:'long'})}</div><div class="day-type">${list.map(x=>`<span class="work-pill" style="--c:${x.w?.color||'#777'}">${escapeHtml(x.w?.name||'Работа')}</span>`).join(' ')} · ${list.reduce((s,x)=>s+(+x.e.hours||0),0)} ч</div></div><div class="day-money">${money(sum)}</div></div>`}).join('')||'<div class="empty-state"><div class="empty-state-icon">📊</div><b>Пока нет записей</b><span>Сохраните хотя бы один рабочий день, и здесь появится история месяца.</span></div>';document.querySelectorAll('[data-edit]').forEach(x=>x.onclick=()=>openDayEditor(x.dataset.edit));renderGoal();renderForecast();renderWorkBreakdown()}
function renderWorkBreakdown(){const box=document.getElementById('workBreakdown');if(!box)return;const map={};entriesForMonth().forEach(x=>map[x.e.workId]=(map[x.e.workId]||0)+earningsOf(x.e,x.w));box.innerHTML=Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([id,n])=>{const w=work(id);return `<div class="break-row"><i style="background:${w?.color||'#777'}"></i><span>${escapeHtml(w?.name||'Работа')}</span><b>${money(n)}</b></div>`}).join('')||'<div class="empty-state"><b>Нет данных</b><span>Когда появятся записи, разбивка заполнится автоматически.</span></div>'}
function renderGoal(){const m=monthKey(),g=+data.goals[m]||0,total=entriesForMonth().reduce((s,x)=>s+earningsOf(x.e,x.w),0);document.getElementById('goalValue').textContent=g?money(g):'Не задана';const p=g?Math.min(100,total/g*100):0;document.getElementById('goalProgress').style.width=p+'%';document.getElementById('goalHint').textContent=g?`${money(total)} из ${money(g)} · ${Math.round(p)}%`:'Поставьте цель по заработку'}
function expectedForWork(workId,month){const same=entriesForMonth(month).filter(x=>x.e.workId===workId), hist=Object.entries(data.days).flatMap(([date,day])=>(day.entries||[]).filter(e=>e.workId===workId).map(e=>({date,e,w:work(workId)})));const src=same.length?same:hist;return src.length?src.reduce((s,x)=>s+earningsOf(x.e,x.w),0)/src.length:0}
function renderForecast(){const now=new Date(),same=now.getFullYear()===viewMonth.getFullYear()&&now.getMonth()===viewMonth.getMonth(),actual=entriesForMonth().filter(x=>x.date<=today()),actualTotal=actual.reduce((s,x)=>s+earningsOf(x.e,x.w),0),future=[];if(same){const daysIn=new Date(viewMonth.getFullYear(),viewMonth.getMonth()+1,0).getDate();for(let day=now.getDate()+1;day<=daysIn;day++){const d=`${viewMonth.getFullYear()}-${String(viewMonth.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`,marks=Array.isArray(data.calendar[d])?data.calendar[d]:data.calendar[d]&&data.calendar[d]!=='off'?[data.calendar[d]]:[];if(marks.length)marks.filter(id=>id!=='off').forEach(id=>future.push({d,id,expected:expectedForWork(id,viewMonth)}))}}const forecast=actualTotal+future.reduce((s,x)=>s+x.expected,0);document.getElementById('forecastValue').textContent=money(forecast);if(!same)document.getElementById('forecastText').textContent='Прогноз рассчитывается только для текущего месяца.';else if(!future.length)document.getElementById('forecastText').textContent='Нет будущих рабочих дней в календаре.';else document.getElementById('forecastText').textContent=`Учтено ${future.length} отмеч. смен · ожидаемо ${money(future.reduce((s,x)=>s+x.expected,0))}.`}
function renderCalendar(){const y=viewMonth.getFullYear(),m=viewMonth.getMonth(),first=new Date(y,m,1),days=new Date(y,m+1,0).getDate();document.getElementById('calendarMonth').textContent=monthLabel();let start=(first.getDay()+6)%7,html='';for(let i=0;i<start;i++)html+='<div class="cal-day empty"></div>';for(let day=1;day<=days;day++){const d=`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`,marks=Array.isArray(data.calendar[d])?data.calendar[d]:data.calendar[d]&&data.calendar[d]!=='off'?[data.calendar[d]]:[],off=data.calendar[d]==='off',entries=normalizeDayEntries(data.days[d]),sum=entries.reduce((s,e)=>s+earningsOf(e,work(e.workId)),0),colors=marks.filter(x=>x!=='off').map(id=>work(id)?.color).filter(Boolean);html+=`<button class="cal-day ${off?'off':''} ${d===today()?'today':''} ${d===selectedDate?'selected':''}" data-date="${d}"><span class="num">${day}</span><span class="mark-dots">${colors.slice(0,3).map(c=>`<i style="background:${c}"></i>`).join('')}</span>${sum?`<span class="money">${Math.round(sum)}₽</span>`:''}${data.notes[d]?.text?'<span class="note-dot">●</span>':''}</button>`}document.getElementById('calendarGrid').innerHTML=html;document.querySelectorAll('.cal-day[data-date]').forEach(b=>b.onclick=()=>calendarClick(b.dataset.date));loadNote(selectedDate);updatePaintUI()}
function calendarClick(d){selectedDate=d;if(paintMode){if(paintMode!=='off' && d<=today()){let marks=Array.isArray(data.calendar[d])?data.calendar[d]:data.calendar[d]&&data.calendar[d]!=='off'?[data.calendar[d]]:[];if(!marks.includes(paintMode)){if(data.calendar[d]==='off')marks=[];marks.push(paintMode);data.calendar[d]=marks;save();}const existing=normalizeDayEntries(data.days[d]).find(e=>e.workId===paintMode&&e.type!=='off');loadNote(d);openDayEditor(d,existing?.id||null,paintMode);return}let message='';if(paintMode==='off'){const was=data.calendar[d]==='off';data.calendar[d]=was?[]:'off';message=was?'Выходной снят':'День отмечен как выходной'}else{let marks=Array.isArray(data.calendar[d])?data.calendar[d]:data.calendar[d]&&data.calendar[d]!=='off'?[data.calendar[d]]:[];if(marks.includes(paintMode)){marks=marks.filter(x=>x!==paintMode);message=`${work(paintMode)?.name||'Работа'} снята с календаря`}else{if(data.calendar[d]==='off')marks=[];marks.push(paintMode);message=`${work(paintMode)?.name||'Работа'} добавлена в календарь`}data.calendar[d]=marks}save();renderAll();toast(message);return}loadNote(d);openDayEditor(d)}
function setPaintMode(m){paintMode=paintMode===m?null:m;updatePaintUI();document.getElementById('paintHint').textContent=paintMode?`Планирование: ${m==='off'?'Выходной':work(m)?.name||'работа'}. Нажмите ещё раз для отключения.`:'Режим выключен. Нажмите дату для просмотра или редактирования.'}
function updatePaintUI(){document.querySelectorAll('.paint-btn').forEach(b=>b.classList.toggle('active',b.dataset.paint===paintMode));const box=document.getElementById('paintWorkButtons');if(box){box.innerHTML=data.works.map(w=>`<button class="paint-btn" data-paint="${w.id}" style="--paint:${w.color}">${escapeHtml(w.name)}</button>`).join('')+'<button class="paint-btn off-paint" data-paint="off">Выходной</button>';box.querySelectorAll('.paint-btn').forEach(b=>b.onclick=()=>setPaintMode(b.dataset.paint));box.querySelectorAll('.paint-btn').forEach(b=>b.classList.toggle('active',b.dataset.paint===paintMode))}}
function loadNote(d){selectedDate=d;const n=data.notes[d]||{};document.getElementById('selectedDateLabel').textContent=dateObj(d).toLocaleDateString('ru-RU',{day:'numeric',month:'long'});document.getElementById('noteText').value=n.text||'';document.getElementById('reminderTime').value=n.time||'';document.getElementById('reminderInfo').textContent=n.time?'Напоминание: '+n.time:''}
function saveNote(){haptic('success');const text=document.getElementById('noteText').value.trim(),time=document.getElementById('reminderTime').value;if(text||time)data.notes[selectedDate]={text,time};else delete data.notes[selectedDate];save();renderCalendar();toast('Заметка сохранена')}
function openDayEditor(d,entryId=null,preferredWorkId=null){editingDate=d;editingEntryId=entryId;const day=data.days[d],entries=normalizeDayEntries(day);const e=entryId?entries.find(x=>x.id===entryId):(preferredWorkId?entries.find(x=>x.workId===preferredWorkId&&x.type!=='off'):entries[0]);const w=work(e?.workId||preferredWorkId||data.activeWorkId);document.getElementById('modalTitle').textContent=`${dateObj(d).toLocaleDateString('ru-RU',{day:'numeric',month:'long'})}`;renderEntryList(d);document.getElementById('editWorkSelect').value=w?.id||'';fillEditor(e,w);document.getElementById('dayModal').classList.remove('hidden')}
function renderEntryList(d){const box=document.getElementById('entryList');if(!box)return;const es=normalizeDayEntries(data.days[d]);box.innerHTML=es.map(e=>{const w=work(e.workId);return `<button class="entry-chip ${e.id===editingEntryId?'active':''}" data-entry="${e.id}"><i style="background:${w?.color||'#777'}"></i>${escapeHtml(w?.name||'Работа')} · ${money(calc(e,w))}</button>`}).join('')+'<button class="entry-chip add-entry" data-entry="new">＋ Добавить работу</button>';box.querySelectorAll('[data-entry]').forEach(b=>b.onclick=()=>{if(b.dataset.entry==='new'){editingEntryId=null;const w=activeWork();document.getElementById('editWorkSelect').value=w.id;fillEditor(null,w)}else openDayEditor(d,b.dataset.entry)})}
function fillEditor(e,w){document.querySelectorAll('.modal-type').forEach(b=>b.classList.toggle('active',b.dataset.type===(e?.type||'shift')));document.getElementById('editCash').value=e?.cash??'';document.getElementById('editCard').value=e?.card??'';document.getElementById('editHours').value=e?.hours??'';document.getElementById('editBoostHours').value=e?.hours??'';updateEditPreview()}
function updateEditPreview(){const w=work(document.getElementById('editWorkSelect').value),type=document.querySelector('.modal-type.active')?.dataset.type||'shift',v={type,workId:w?.id,cash:numVal('editCash'),card:numVal('editCard'),hours:type==='boost'?numVal('editBoostHours'):numVal('editHours'),formulaSnapshot:w?.formula};document.getElementById('modalShift').classList.toggle('hidden',type!=='shift');document.getElementById('modalBoost').classList.toggle('hidden',type!=='boost');document.getElementById('editFormula').textContent=w?formulaText(w):'';document.getElementById('editEarningsPreview').textContent=money(calc(v,w))}
function saveDayEdit(){const d=editingDate,w=work(document.getElementById('editWorkSelect').value),type=document.querySelector('.modal-type.active')?.dataset.type||'shift';data.days[d] ||= {entries:[]};let e=editingEntryId?data.days[d].entries.find(x=>x.id===editingEntryId):null;if(!e){e={id:uid()};data.days[d].entries.push(e)}Object.assign(e,{type,workId:w.id,cash:numVal('editCash'),card:numVal('editCard'),hours:type==='boost'?numVal('editBoostHours'):numVal('editHours'),formulaSnapshot:{...w.formula}});e.earnings=calc(e,w);if(type==='off'){data.days[d].entries=data.days[d].entries.filter(x=>x.id!==e.id);data.calendar[d]='off'}else{let marks=Array.isArray(data.calendar[d])?data.calendar[d]:[];if(!marks.includes(w.id))marks.push(w.id);data.calendar[d]=marks}if(!data.days[d].entries.length)delete data.days[d];save();closeModal();renderAll();toast('День сохранён')}
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
let editingCategoryId=null,editingCategoryType='expense';
function renderCategorySettings(){
 const render=(type)=>{const list=categoryList(type);return list.map(c=>`<div class="category-setting-row"><span class="category-setting-icon">${c.icon||'•'}</span><div class="category-setting-info"><b>${escapeHtml(c.name)}</b><small>${type==='expense'?'Используется для расходов':'Используется для доходов'}</small></div><button class="secondary-btn small-btn" data-category-edit="${c.id}" data-category-type="${type}">Изменить</button></div>`).join('')};
 const e=document.getElementById('expenseCategoryList'),i=document.getElementById('incomeCategoryList');if(e)e.innerHTML=render('expense');if(i)i.innerHTML=render('income');
 document.querySelectorAll('[data-category-edit]').forEach(b=>b.onclick=()=>openCategoryEditor(b.dataset.categoryType,b.dataset.categoryEdit));
}
function openCategoryEditor(type='expense',id=null){ensureFinance();editingCategoryType=type;editingCategoryId=id;const c=id?categoryFor(type,id):{name:'',icon:'•'};document.getElementById('categoryModalTitle').textContent=id?'Изменить категорию':'Новая категория';document.getElementById('categoryTypeLabel').textContent=type==='expense'?'РАСХОД':'ДОХОД';document.getElementById('categoryName').value=c.name||'';document.getElementById('categoryIcon').value=c.icon||'•';document.getElementById('deleteCategoryBtn').classList.toggle('hidden',!id||categoryList(type).length<=1||id===(type==='income'?'other_income':'other'));document.getElementById('categoryModal').classList.remove('hidden')}
function saveCategory(){ensureFinance();const name=document.getElementById('categoryName').value.trim();const icon=document.getElementById('categoryIcon').value.trim()||'•';if(!name){toast('Введите название категории');return}const list=categoryList(editingCategoryType);if(editingCategoryId){const c=list.find(x=>x.id===editingCategoryId);if(c)Object.assign(c,{name,icon})}else list.push({id:uid(),name,icon});save();closeCategoryEditor();renderAll();toast(editingCategoryId?'Категория изменена ✓':'Категория добавлена ✓')}
function deleteCategory(){if(!editingCategoryId)return;const list=categoryList(editingCategoryType);if(list.length<=1){toast('Нельзя удалить последнюю категорию');return}const fallback=categoryFor(editingCategoryType);if(!fallback||fallback.id===editingCategoryId){toast('Сначала оставьте категорию «Другое»');return}if(!confirm('Удалить категорию? Операции и бюджеты этой категории будут перенесены в «Другое».'))return;data.transactions.forEach(t=>{if(t.type===editingCategoryType&&t.categoryId===editingCategoryId)t.categoryId=fallback.id});if(editingCategoryType==='expense'){Object.values(data.budgets||{}).forEach(b=>{if(b&&b[editingCategoryId]!=null){b[fallback.id]=(Number(b[fallback.id])||0)+(Number(b[editingCategoryId])||0);delete b[editingCategoryId]}})}data[editingCategoryType==='expense'?'expenseCategories':'incomeCategories']=list.filter(c=>c.id!==editingCategoryId);save();closeCategoryEditor();renderAll();toast('Категория удалена')}
function closeCategoryEditor(){document.getElementById('categoryModal').classList.add('hidden');editingCategoryId=null}

function renderWorkList(){document.getElementById('workList').innerHTML=data.works.map(w=>`<div class="work-row"><i class="work-color" style="background:${w.color}"></i><div class="work-info"><b>${escapeHtml(w.name)}</b><small>${escapeHtml(formulaText(w))}</small></div><button data-work-edit="${w.id}">Изменить</button></div>`).join('');document.querySelectorAll('[data-work-edit]').forEach(b=>b.onclick=()=>openWorkEditor(b.dataset.workEdit));updatePaintUI()}
function updateFormulaFields(){
  const type=document.getElementById('formulaType')?.value||'hour_percent';
  document.getElementById('formulaRateField')?.classList.toggle('hidden',!['hour_percent','hourly'].includes(type));
  document.getElementById('formulaPercentField')?.classList.toggle('hidden',!['hour_percent','percent'].includes(type));
  document.getElementById('formulaFixedField')?.classList.toggle('hidden',type!=='fixed');
}
function openWorkEditor(id=null){editingWorkId=id;const w=id?work(id):makeWork();document.getElementById('workModalTitle').textContent=id?'Изменить место':'Новое место';document.getElementById('workName').value=w.name;document.getElementById('workColor').value=w.color;document.getElementById('formulaType').value=w.formula.type;document.getElementById('formulaRate').value=w.formula.rate??'';document.getElementById('formulaPercent').value=w.formula.percent??'';document.getElementById('formulaFixed').value=w.formula.fixed??'';document.getElementById('deleteWorkBtn').classList.toggle('hidden',!id);updateFormulaFields();document.getElementById('workModal').classList.remove('hidden')}
function saveWork(){haptic('success');const name=document.getElementById('workName').value.trim()||'Без названия',type=document.getElementById('formulaType').value,f={type,rate:numVal('formulaRate'),percent:numVal('formulaPercent'),fixed:numVal('formulaFixed')},color=document.getElementById('workColor').value;if(editingWorkId){Object.assign(work(editingWorkId),{name,color,formula:f})}else{const w={...makeWork(name,color),name,color,formula:f};data.works.push(w);data.activeWorkId=w.id}save();closeWorkModal();renderAll();toast('Место работы сохранено')}
function deleteWork(){if(!editingWorkId||data.works.length<=1)return toast('Нужно оставить хотя бы одно место работы');if(!confirm('Удалить место работы? История записей останется.'))return;data.works=data.works.filter(w=>w.id!==editingWorkId);data.activeWorkId=data.works[0].id;save();closeWorkModal();renderAll();toast('Место удалено')}
function closeWorkModal(){document.getElementById('workModal').classList.add('hidden');editingWorkId=null}
function openGoal(){document.getElementById('goalInput').value=data.goals[monthKey()]||'';document.getElementById('goalModal').classList.remove('hidden')}
function saveGoal(){haptic('success');const v=numVal('goalInput');if(v)data.goals[monthKey()]=v;else delete data.goals[monthKey()];save();document.getElementById('goalModal').classList.add('hidden');renderMonth();toast(v?'Цель сохранена':'Цель удалена')}
function exportData(){const payload={app:'Мой заработок',version:20,exportedAt:new Date().toISOString(),data};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`moj-zarabotok-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Резервная копия создана')}
function importData(file){const r=new FileReader();r.onload=()=>{try{const p=JSON.parse(r.result),d=normalize(p.data||p);if(!d.works.length)throw 0;if(!confirm('Импорт полностью заменит текущие данные. Продолжить?'))return;data=d;save();renderAll();toast('Данные импортированы')}catch{toast('Не удалось импортировать файл')}};r.readAsText(file)}
function clearMonth(){if(!confirm(`Удалить все данные за ${monthLabel()}? Это нельзя отменить.`))return;const m=monthKey();Object.keys(data.days).filter(d=>d.startsWith(m)).forEach(d=>delete data.days[d]);Object.keys(data.notes).filter(d=>d.startsWith(m)).forEach(d=>delete data.notes[d]);Object.keys(data.calendar).filter(d=>d.startsWith(m)).forEach(d=>delete data.calendar[d]);delete data.goals[m];save();renderAll();toast('Данные месяца очищены')}
function showScreen(s){haptic();document.querySelectorAll('.screen').forEach(x=>x.classList.toggle('active',x.id===s));document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.screen===s));if(s==='month')renderMonth();if(s==='calendar')renderCalendar();if(s==='stats')renderStats();if(s==='settings')renderSettings()}
function applyTheme(){const dark=data.settings.theme==='dark';document.documentElement.classList.toggle('dark',dark);document.body.classList.toggle('dark',dark);const meta=document.querySelector('meta[name=theme-color]');if(meta)meta.content=dark?'#11121a':'#5865e8';const b=document.getElementById('themeToggle');if(b)b.textContent=dark?'☀️ Светлая тема':'🌙 Тёмная тема'}
function toggleTheme(){haptic();data.settings.theme=data.settings.theme==='dark'?'light':'dark';save();applyTheme();toast(data.settings.theme==='dark'?'Тёмная тема включена':'Светлая тема включена')}
function renderSettings(){ensureFinance();renderWorkList();renderCategorySettings();document.getElementById('userName').value=data.user.name||'';applyTheme()}
function renderAll(){applyTheme();document.body.classList.add('app-ready');document.getElementById('greeting').textContent=data.user.name?`Привет, ${data.user.name}`:new Date().toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'});renderWorkSelects();renderMonth();renderCalendar();renderStats();renderSettings()}
document.getElementById('homeWorkSelect').onchange=e=>{data.activeWorkId=e.target.value;save();renderHomeFields()};document.getElementById('themeToggle').onclick=toggleTheme;document.getElementById('addWorkQuick').onclick=()=>openWorkEditor();document.querySelectorAll('#home input').forEach(x=>x.oninput=updatePreview);document.getElementById('saveBtn').onclick=saveToday;document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>showScreen(b.dataset.screen));document.getElementById('settingsBtn').onclick=()=>showScreen('settings');document.getElementById('saveNoteBtn').onclick=saveNote;document.getElementById('editSelectedBtn').onclick=()=>openDayEditor(selectedDate);document.getElementById('monthPrev').onclick=()=>shiftMonth(-1);document.getElementById('monthNext').onclick=()=>shiftMonth(1);document.getElementById('calPrev').onclick=()=>shiftMonth(-1);document.getElementById('calNext').onclick=()=>shiftMonth(1);document.getElementById('statsPrev').onclick=()=>shiftStats(-1);document.getElementById('statsNext').onclick=()=>shiftStats(1);document.getElementById('goalBtn').onclick=openGoal;document.getElementById('saveGoalBtn').onclick=saveGoal;document.getElementById('clearGoalBtn').onclick=()=>{delete data.goals[monthKey()];save();document.getElementById('goalModal').classList.add('hidden');renderMonth()};document.getElementById('closeGoalModal').onclick=()=>document.getElementById('goalModal').classList.add('hidden');document.querySelector('#goalModal .modal-backdrop').onclick=()=>document.getElementById('goalModal').classList.add('hidden');document.querySelectorAll('.modal-type').forEach(b=>b.onclick=()=>setEditType(b.dataset.type));document.getElementById('editWorkSelect').onchange=updateEditPreview;['editCash','editCard','editHours','editBoostHours'].forEach(id=>document.getElementById(id).oninput=updateEditPreview);document.getElementById('saveDayEdit').onclick=saveDayEdit;document.getElementById('deleteDayBtn').onclick=deleteDay;document.getElementById('closeModal').onclick=closeModal;document.querySelector('#dayModal .modal-backdrop').onclick=closeModal;document.getElementById('addWorkBtn').onclick=()=>openWorkEditor();document.getElementById('saveWorkBtn').onclick=saveWork;document.getElementById('formulaType').onchange=updateFormulaFields;document.getElementById('deleteWorkBtn').onclick=deleteWork;document.getElementById('closeWorkModal').onclick=closeWorkModal;document.querySelector('#workModal .modal-backdrop').onclick=closeWorkModal;document.getElementById('saveProfileBtn').onclick=()=>{data.user.name=document.getElementById('userName').value.trim();save();renderAll();toast('Профиль сохранён')};document.getElementById('exportBtn').onclick=exportData;document.getElementById('importBtn').onclick=()=>document.getElementById('importFile').click();document.getElementById('importFile').onchange=e=>{if(e.target.files[0])importData(e.target.files[0]);e.target.value=''};document.getElementById('clearMonthBtn').onclick=clearMonth;

function initUX(){
  // Currency fields: human-readable grouping on blur, numeric value preserved by numVal().
  const moneyIds=['cash','card','editCash','editCard','goalInput','formulaRate','formulaFixed'];
  moneyIds.forEach(id=>{const el=document.getElementById(id);if(!el)return;el.addEventListener('focus',()=>clearMoneyInput(el));el.addEventListener('blur',()=>formatMoneyInput(el));el.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();el.blur()}})});
  // Friendly input validation as the user types.
  ['cash','card','hours'].forEach(id=>document.getElementById(id)?.addEventListener('input',()=>fieldError(id,'')));
  // iOS keyboards can cover the field. Scroll the focused control into a comfortable position.
  document.addEventListener('focusin',e=>{const t=e.target;if(!['INPUT','TEXTAREA','SELECT'].includes(t.tagName))return;setTimeout(()=>t.scrollIntoView({behavior:'smooth',block:'center'}),180)});
  if(window.visualViewport){visualViewport.addEventListener('resize',()=>{document.body.style.setProperty('--keyboard-height',Math.max(0,window.innerHeight-visualViewport.height)+'px')})}
  // Best-effort haptics. iOS Safari intentionally does not expose arbitrary vibration APIs to PWAs.
  document.addEventListener('pointerdown',e=>{const b=e.target.closest('button');if(b&&!b.disabled&&!b.classList.contains('tab'))haptic('light')},{passive:true});
  // Prevent accidental double taps on primary actions.
  document.querySelectorAll('.primary-btn').forEach(b=>b.addEventListener('dblclick',e=>e.preventDefault()));
}
initUX();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
function restoreFromIndexedDB(){try{const r=indexedDB.open('EarningsTrackerDB',2);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains('state'))db.createObjectStore('state')};r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readonly'),req=tx.objectStore('state').get('current');req.onsuccess=()=>{const saved=req.result;if(saved?.data){const restored=normalize(saved.data);const localUseful=Object.keys(data.days||{}).length+Object.keys(data.calendar||{}).length;const restoredUseful=Object.keys(restored.days||{}).length+Object.keys(restored.calendar||{}).length;if(restoredUseful>=localUseful){data=restored;data.activeWorkId=data.activeWorkId||data.works[0]?.id;localStorage.setItem(KEY,JSON.stringify(data));renderAll();hideLoading()}}};tx.oncomplete=()=>db.close()}}catch{}}

/* v17-v20 finance engine */
const DEFAULT_EXPENSE_CATEGORIES=[
 {id:'food',name:'Еда',icon:'🍜'},{id:'transport',name:'Транспорт',icon:'🚕'},{id:'home',name:'Дом',icon:'🏠'},
 {id:'fun',name:'Развлечения',icon:'🎮'},{id:'shopping',name:'Покупки',icon:'🛍️'},{id:'health',name:'Здоровье',icon:'❤️'},
 {id:'clothes',name:'Одежда',icon:'👕'},{id:'subscriptions',name:'Подписки',icon:'🔁'},{id:'travel',name:'Путешествия',icon:'✈️'},{id:'other',name:'Другое',icon:'•'}
];
const DEFAULT_INCOME_CATEGORIES=[
 {id:'salary',name:'Зарплата',icon:'💼'},{id:'side_job',name:'Подработка',icon:'🛠️'},{id:'bonus',name:'Премия',icon:'🎁'},
 {id:'gift',name:'Подарок',icon:'🎀'},{id:'refund',name:'Возврат',icon:'↩️'},{id:'other_income',name:'Другое',icon:'•'}
];
function cloneCategories(list){return list.map(c=>({...c}));}
function categoryList(type='expense'){return type==='income'?data.incomeCategories:data.expenseCategories}
function categoryFor(type,id){const list=categoryList(type);const fallbackId=type==='income'?'other_income':'other';return list.find(c=>c.id===id)||list.find(c=>c.id===fallbackId)||list[0];}
function ensureFinance(){
 data.expenseCategories=Array.isArray(data.expenseCategories)?data.expenseCategories:[];
 data.incomeCategories=Array.isArray(data.incomeCategories)?data.incomeCategories:[];
 if(!data.expenseCategories.length){
   const legacy=Array.isArray(data.categories)?data.categories:[];
   data.expenseCategories=legacy.length?legacy.map(c=>({id:c.id||uid(),name:c.name||'Без названия',icon:c.icon||'•'})):cloneCategories(DEFAULT_EXPENSE_CATEGORIES);
 }
 if(!data.incomeCategories.length) data.incomeCategories=cloneCategories(DEFAULT_INCOME_CATEGORIES);
 if(!data.expenseCategories.some(c=>c.id==='other')) data.expenseCategories.push({id:'other',name:'Другое',icon:'•'});
 if(!data.incomeCategories.some(c=>c.id==='other_income')) data.incomeCategories.push({id:'other_income',name:'Другое',icon:'•'});
 data.transactions=Array.isArray(data.transactions)?data.transactions:[];
 data.budgets=data.budgets&&typeof data.budgets==='object'?data.budgets:{};
 data.transactions=data.transactions.filter(t=>t&&t.id).map(t=>({...t,type:['income','expense','transfer'].includes(t.type)?t.type:'expense',amount:Math.max(0,Number(t.amount)||0),date:t.date||today(),categoryId:t.categoryId||(t.type==='income'?'other_income':'other'),accountId:t.accountId||'cash',note:t.note||'',createdAt:t.createdAt||Date.now()}));
 data.transactions.forEach(t=>{if(t.type==='income' && !data.incomeCategories.some(c=>c.id===t.categoryId))t.categoryId='other_income';if(t.type==='expense' && !data.expenseCategories.some(c=>c.id===t.categoryId))t.categoryId='other';if(t.type==='transfer')t.categoryId='transfer'});
}
ensureFinance();
function txCategory(id,type='expense'){return categoryFor(type,id)}
function monthTransactions(d=viewMonth){const m=monthKey(d);return data.transactions.filter(t=>t.date.startsWith(m));}
function monthIncome(d=viewMonth){return entriesForMonth(d).reduce((s,x)=>s+earningsOf(x.e,x.w),0)+monthTransactions(d).filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0)}
function monthExpenses(d=viewMonth){return monthTransactions(d).filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0)}
function hourlyValue(){const es=entriesForMonth(viewMonth);const hours=es.reduce((s,x)=>s+(Number(x.e.hours)||0),0);const income=es.reduce((s,x)=>s+earningsOf(x.e,x.w),0);return hours?income/hours:((activeWork()?.formula?.rate)||0);}
function workTimeForAmount(amount){const rate=hourlyValue();if(!rate)return 0;return amount/rate}
function humanHours(h){if(!h)return '0 ч';const hours=Math.floor(h),mins=Math.round((h-hours)*60);return hours?`${hours} ч ${mins?mins+' мин':''}`.trim():`${mins} мин`}
function renderMoney(){
 ensureFinance();
 const income=monthIncome(moneyMonthDate),expense=monthExpenses(moneyMonthDate),net=income-expense;
 const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
 set('moneyMonth',monthLabel(moneyMonthDate));set('moneyIncome',money(income));set('moneyExpense',money(expense));set('moneyNet',money(net));
 const tx=monthTransactions(moneyMonthDate).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);
 set('transactionsCount',tx.length);
 const list=document.getElementById('transactionsList');
 if(list)list.innerHTML=tx.length?tx.slice(0,40).map(t=>{const c=txCategory(t.categoryId,t.type);return `<button class="tx-row" data-tx-edit="${t.id}"><span class="tx-icon">${c.icon||'•'}</span><span class="tx-main"><b>${escapeHtml(c.name)}</b><small>${dateObj(t.date).toLocaleDateString('ru-RU',{day:'numeric',month:'short'})}${t.note?' · '+escapeHtml(t.note):''}</small></span><span class="tx-amount ${t.type}">${t.type==='expense'?'−':'+'}${money(t.amount)}</span></button>`}).join(''):'<div class="empty-state compact"><b>Операций пока нет</b><span>Добавление занимает несколько секунд. Человечество наконец-то изобрело кнопку «− Расход».</span></div>';
 document.querySelectorAll('[data-tx-edit]').forEach(b=>b.onclick=()=>openTransaction(b.dataset.txEdit));
 const h=monthExpenses(moneyMonthDate);const wt=workTimeForAmount(h);set('moneyWorkTime',humanHours(wt));set('moneyWorkTimeHint',h?`${money(h)} расходов = примерно ${humanHours(wt)} рабочего времени по вашей средней ставке.`:'Добавьте расход, чтобы увидеть его эквивалент в рабочем времени.');
 renderBudgets();
}
let moneyMonthDate=new Date(new Date().getFullYear(),new Date().getMonth(),1);
function shiftMoney(delta){moneyMonthDate=new Date(moneyMonthDate.getFullYear(),moneyMonthDate.getMonth()+delta,1);renderMoney()}
function openTransaction(id=null,type='expense'){
 const t=id?data.transactions.find(x=>x.id===id):null;txEditingId=id||null;txType=t?.type||type;
 document.getElementById('transactionTitle').textContent=t?'Изменить операцию':txType==='expense'?'Новый расход':'Новый доход';
 document.getElementById('transactionEyebrow').textContent=txType==='expense'?'РАСХОД':'ДОХОД';
 document.getElementById('txAmount').value=t?.amount??'';ensureFinance();const categoryType=t?.type||txType;document.getElementById('txCategory').innerHTML=categoryList(categoryType).map(c=>`<option value="${c.id}">${c.icon||'•'} ${escapeHtml(c.name)}</option>`).join('');document.getElementById('txCategory').value=t?.categoryId||categoryFor(categoryType).id;document.getElementById('txDate').value=t?.date||today();document.getElementById('txAccount').value=t?.accountId||'cash';document.getElementById('txNote').value=t?.note||'';document.getElementById('deleteTransactionBtn').classList.toggle('hidden',!t);setTxType(txType);updateTxWorkTime();document.getElementById('transactionModal').classList.remove('hidden');
}
let txEditingId=null,txType='expense';
function setTxType(type){txType=type;document.querySelectorAll('.tx-type').forEach(b=>b.classList.toggle('active',b.dataset.txType===type));document.getElementById('transactionEyebrow').textContent=type==='expense'?'РАСХОД':'ДОХОД';document.getElementById('transactionTitle').textContent=txEditingId?'Изменить операцию':type==='expense'?'Новый расход':'Новый доход';const sel=document.getElementById('txCategory');const current=sel.value;sel.innerHTML=categoryList(type).map(c=>`<option value="${c.id}">${c.icon||'•'} ${escapeHtml(c.name)}</option>`).join('');sel.value=categoryFor(type,current)?.id||categoryFor(type).id;updateTxWorkTime()}
function updateTxWorkTime(){const a=Number(String(document.getElementById('txAmount')?.value||'').replace(/\s/g,'').replace(',','.'))||0;const el=document.getElementById('txWorkTime');if(!el)return;el.textContent=txType==='expense'&&a?`Это ≈ ${humanHours(workTimeForAmount(a))} рабочего времени.`:''}
function saveTransaction(){const amount=Number(String(document.getElementById('txAmount').value).replace(/\s/g,'').replace(',','.'));if(!Number.isFinite(amount)||amount<=0){toast('Введите сумму больше нуля');return}const t=txEditingId?data.transactions.find(x=>x.id===txEditingId):{id:uid(),createdAt:Date.now()};Object.assign(t,{type:txType,amount,date:document.getElementById('txDate').value||today(),categoryId:document.getElementById('txCategory').value,accountId:document.getElementById('txAccount').value,note:document.getElementById('txNote').value.trim()});if(!txEditingId)data.transactions.push(t);save();closeTransaction();renderAll();showScreen('money');toast(txEditingId?'Операция изменена ✓':'Операция сохранена ✓')}
function closeTransaction(){document.getElementById('transactionModal').classList.add('hidden');txEditingId=null}
function deleteTransaction(){if(!txEditingId)return;if(!confirm('Удалить операцию?'))return;data.transactions=data.transactions.filter(t=>t.id!==txEditingId);save();closeTransaction();renderAll();showScreen('money');toast('Операция удалена')}
function renderBudgets(){const m=monthKey(moneyMonthDate),bud=data.budgets[m]||{},spent={};monthTransactions(moneyMonthDate).filter(t=>t.type==='expense').forEach(t=>spent[t.categoryId]=(spent[t.categoryId]||0)+t.amount);const box=document.getElementById('budgetList');if(!box)return;const ids=Object.keys(bud).filter(id=>Number(bud[id])>0);box.innerHTML=ids.length?ids.map(id=>{const c=txCategory(id,'expense'),limit=Number(bud[id]),v=spent[id]||0,p=Math.min(100,v/limit*100);return `<div class="budget-row"><div><b>${c.icon} ${escapeHtml(c.name)}</b><br><small>${money(v)} из ${money(limit)}</small></div><b>${Math.round(p)}%</b><div class="budget-progress ${v>limit?'over':''}"><i style="width:${p}%"></i></div></div>`}).join(''):'<div class="empty-state compact"><b>Бюджеты не заданы</b><span>Лимиты появятся здесь, когда вы перестанете доверять памяти и начнёте доверять цифрам.</span></div>'}
function openBudgets(){const m=monthKey(moneyMonthDate),bud=data.budgets[m]||{},box=document.getElementById('budgetEditor');box.innerHTML='<div class="category-grid">'+data.expenseCategories.map(c=>`<div class="category-edit"><label>${c.icon} ${escapeHtml(c.name)}<input data-budget="${c.id}" type="text" inputmode="decimal" value="${bud[c.id]||''}" placeholder="Без лимита"></label></div>`).join('')+'</div>';document.getElementById('budgetModal').classList.remove('hidden')}
function saveBudgets(){const m=monthKey(moneyMonthDate),bud={};document.querySelectorAll('[data-budget]').forEach(i=>{const v=Number(String(i.value).replace(/\s/g,'').replace(',','.'));if(Number.isFinite(v)&&v>0)bud[i.dataset.budget]=v});data.budgets[m]=bud;save();document.getElementById('budgetModal').classList.add('hidden');renderMoney();toast('Бюджеты сохранены')}
function renderFinanceStats(){
 ensureFinance();const tx=monthTransactions(statsMonth).filter(t=>t.type==='expense'),total=tx.reduce((s,t)=>s+t.amount,0),map={};tx.forEach(t=>map[t.categoryId]=(map[t.categoryId]||0)+t.amount);const items=Object.entries(map).sort((a,b)=>b[1]-a[1]);const box=document.getElementById('expenseBars');if(box){const max=Math.max(...items.map(x=>x[1]),1);box.innerHTML=items.length?items.slice(0,8).map(([id,n])=>{const c=txCategory(id);return `<button class="bar-wrap" title="${escapeHtml(c.name)}: ${money(n)}"><span class="bar-value">${money(n)}</span><i class="bar" style="height:${Math.max(8,n/max*100)}%"></i><small>${escapeHtml(c.name)}</small></button>`}).join(''):'<div class="empty-state compact"><b>Нет расходов</b><span>График появится после первой покупки.</span></div>'}const e=document.getElementById('expenseTotalStat');if(e)e.textContent=money(total);renderInsights(total,items)}
function renderInsights(total,items){const box=document.getElementById('smartInsights');if(!box)return;const income=monthIncome(statsMonth),net=income-total,prev=new Date(statsMonth.getFullYear(),statsMonth.getMonth()-1,1),prevExp=monthExpenses(prev),daily=total/(new Date(statsMonth.getFullYear(),statsMonth.getMonth()+1,0).getDate()||1),daysLeft=Math.max(0,new Date(statsMonth.getFullYear(),statsMonth.getMonth()+1,0).getDate()-new Date().getDate());const insights=[];if(items[0]){const c=txCategory(items[0][0],'expense');insights.push(`<div class="insight"><b>Главная категория</b>${escapeHtml(c.name)}: ${money(items[0][1])}, ${total?Math.round(items[0][1]/total*100):0}% всех расходов.</div>`)}if(prevExp){const diff=(total-prevExp)/prevExp*100;insights.push(`<div class="insight"><b>К прошлому месяцу</b>Расходы ${diff>=0?'выросли':'снизились'} на ${Math.abs(Math.round(diff))}%.</div>`)}if(income){insights.push(`<div class="insight"><b>Чистый поток</b>${money(net)} после расходов. ${net<0?'Расходы уже выше доходов. Математика, к сожалению, не умеет сочувствовать.':'Пока вы в плюсе.'}</div>`)}if(total&&daysLeft>0){insights.push(`<div class="insight"><b>Темп расходов</b>Около ${money(daily)} в день. При таком темпе до конца месяца уйдёт ещё примерно ${money(daily*daysLeft)}.</div>`)}box.innerHTML=insights.join('')||'<div class="empty-state compact"><b>Инсайты появятся здесь</b><span>Нужны хотя бы доходы или расходы.</span></div>'}
function renderAllFinance(){ensureFinance();renderMoney();renderFinanceStats()}
const __oldShowScreen=showScreen;
showScreen=function(s){__oldShowScreen(s);if(s==='money')renderMoney();if(s==='stats')renderFinanceStats()};
const __oldRenderAll=renderAll;
renderAll=function(){__oldRenderAll();renderAllFinance()};
const __oldClearMonth=clearMonth;
clearMonth=function(){const m=monthKey();if(!confirm(`Удалить все данные за ${monthLabel()}? Это нельзя отменить.`))return;Object.keys(data.days).filter(d=>d.startsWith(m)).forEach(d=>delete data.days[d]);Object.keys(data.notes).filter(d=>d.startsWith(m)).forEach(d=>delete data.notes[d]);Object.keys(data.calendar).filter(d=>d.startsWith(m)).forEach(d=>delete data.calendar[d]);data.transactions=data.transactions.filter(t=>!t.date.startsWith(m));delete data.goals[m];delete data.budgets[m];save();renderAll();toast('Данные месяца очищены')};
// Bind finance UI after the original app wiring, because apparently one navigation bar was not enough for humanity.
document.getElementById('addExpenseBtn').onclick=()=>openTransaction(null,'expense');document.getElementById('addIncomeBtn').onclick=()=>openTransaction(null,'income');document.getElementById('moneyPrev').onclick=()=>shiftMoney(-1);document.getElementById('moneyNext').onclick=()=>shiftMoney(1);document.getElementById('budgetBtn').onclick=openBudgets;document.getElementById('saveBudgetsBtn').onclick=saveBudgets;document.getElementById('closeBudgetModal').onclick=()=>document.getElementById('budgetModal').classList.add('hidden');document.querySelector('#budgetModal .modal-backdrop').onclick=()=>document.getElementById('budgetModal').classList.add('hidden');document.getElementById('closeTransactionModal').onclick=closeTransaction;document.querySelector('#transactionModal .modal-backdrop').onclick=closeTransaction;document.getElementById('saveTransactionBtn').onclick=saveTransaction;document.getElementById('deleteTransactionBtn').onclick=deleteTransaction;document.getElementById('txAmount').oninput=updateTxWorkTime;document.querySelectorAll('.tx-type').forEach(b=>b.onclick=()=>setTxType(b.dataset.txType));
const __oldExportData=exportData;exportData=function(){ensureFinance();__oldExportData()};

document.getElementById('addExpenseCategoryBtn').onclick=()=>openCategoryEditor('expense');document.getElementById('addIncomeCategoryBtn').onclick=()=>openCategoryEditor('income');document.getElementById('saveCategoryBtn').onclick=saveCategory;document.getElementById('deleteCategoryBtn').onclick=deleteCategory;document.getElementById('closeCategoryModal').onclick=closeCategoryEditor;document.querySelector('#categoryModal .modal-backdrop').onclick=closeCategoryEditor;
renderAll();
setTimeout(hideLoading,180);
restoreFromIndexedDB();

/* v18 exports + intelligent forecasting */
function monthKeyForDate(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function parseMonthInput(v){if(!/^\d{4}-\d{2}$/.test(v))return new Date(new Date().getFullYear(),new Date().getMonth(),1);const [y,m]=v.split('-').map(Number);return new Date(y,m-1,1)}
function selectedExportDate(){return parseMonthInput(document.getElementById('exportMonth')?.value||monthKeyForDate(new Date()))}
function monthLabelForDate(d){return d.toLocaleDateString('ru-RU',{month:'long',year:'numeric'})}
function monthTxAndEarnings(d){
 const mk=monthKeyForDate(d), tx=monthTransactions(d), earnings=entriesForMonth(d).map(x=>({date:x.date,work:x.w?.name||'Работа',workId:x.e.workId,type:x.e.type||'shift',cash:Number(x.e.cash)||0,card:Number(x.e.card)||0,hours:Number(x.e.hours)||0,earnings:earningsOf(x.e,x.w)}));
 return {mk,tx,earnings};
}
function exportRows(d){
 const {mk,tx,earnings}=monthTxAndEarnings(d), rows=[];
 earnings.forEach(e=>rows.push({Дата:e.date,Тип:'Заработок',Категория:e.work,Описание:e.type==='boost'?'Усиление':'Смена',Наличные:e.cash,Безнал:e.card,Часы:e.hours,Сумма:e.earnings,Счёт:'',Комментарий:''}));
 tx.forEach(t=>{const c=txCategory(t.categoryId,t.type);rows.push({Дата:t.date,Тип:t.type==='expense'?'Расход':'Доход',Категория:c.name,Описание:t.type==='expense'?'Покупка':'Доп. доход',Наличные:t.accountId==='cash'?t.amount:0,Безнал:t.accountId==='card'?t.amount:0,Часы:'',Сумма:t.amount,Счёт:t.accountId==='card'?'Карта':'Наличные',Комментарий:t.note||''})});
 return rows.sort((a,b)=>a.Дата.localeCompare(b.Дата));
}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function exportCSV(){const d=selectedExportDate(),rows=exportRows(d),headers=['Дата','Тип','Категория','Описание','Наличные','Безнал','Часы','Сумма','Счёт','Комментарий'];const esc=v=>`"${String(v??'').replace(/"/g,'""')}`;const csv='\ufeff'+[headers,...rows.map(r=>headers.map(h=>esc(r[h])).join(';'))].map(r=>Array.isArray(r)?r.join(';'):r).join('\r\n');downloadBlob(new Blob([csv],{type:'text/csv;charset=utf-8'}),`moj-zarabotok-${monthKeyForDate(d)}.csv`);toast('CSV отчёт готов ✓')}
function exportExcel(){const d=selectedExportDate(),rows=exportRows(d),headers=['Дата','Тип','Категория','Описание','Наличные','Безнал','Часы','Сумма','Счёт','Комментарий'];const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');const body=rows.map(r=>`<tr>${headers.map(h=>`<td>${esc(r[h])}</td>`).join('')}</tr>`).join('');const html=`<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial}h1{font-size:18px}table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px}th{background:#eee}</style></head><body><h1>Мой заработок · ${escapeHtml(monthLabelForDate(d))}</h1><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></body></html>`;downloadBlob(new Blob([html],{type:'application/vnd.ms-excel;charset=utf-8'}),`moj-zarabotok-${monthKeyForDate(d)}.xls`);toast('Excel-файл готов ✓')}
function exportPDF(){const d=selectedExportDate(),rows=exportRows(d),income=monthIncome(d),expense=monthExpenses(d),net=income-expense,forecast=smartForecast(d);const cats={};rows.filter(r=>r.Тип==='Расход').forEach(r=>cats[r.Категория]=(cats[r.Категория]||0)+Number(r.Сумма||0));const catRows=Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([n,v])=>`<tr><td>${escapeHtml(n)}</td><td>${money(v)}</td><td>${expense?Math.round(v/expense*100):0}%</td></tr>`).join('');const txRows=rows.map(r=>`<tr><td>${r.Дата}</td><td>${escapeHtml(r.Тип)}</td><td>${escapeHtml(r.Категория)}</td><td>${escapeHtml(r.Описание)}</td><td>${money(Number(r.Сумма)||0)}</td><td>${escapeHtml(r.Комментарий)}</td></tr>`).join('');const w=window.open('','_blank');if(!w){toast('Браузер заблокировал окно отчёта');return}w.document.write(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Отчёт · ${escapeHtml(monthLabelForDate(d))}</title><style>@page{size:A4;margin:16mm}body{font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;color:#171821;font-size:10pt}h1{font-size:22pt;margin:0 0 4px}h2{font-size:13pt;margin:20px 0 8px}.muted{color:#666}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.card{border:1px solid #ddd;border-radius:10px;padding:10px}.card b{display:block;font-size:16pt;margin-top:3px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border-bottom:1px solid #ddd;padding:6px;text-align:left}th{background:#f3f3f5}.negative{color:#c93659}.positive{color:#16864f}.small{font-size:8.5pt}.footer{margin-top:24px;color:#777;font-size:8pt}</style></head><body><h1>Мой заработок</h1><div class="muted">Финансовый отчёт за ${escapeHtml(monthLabelForDate(d))}</div><div class="grid"><div class="card">Доход<b class="positive">${money(income)}</b></div><div class="card">Расходы<b class="negative">${money(expense)}</b></div><div class="card">Осталось<b>${money(net)}</b></div></div><h2>Прогноз заработка</h2><div class="card">${money(forecast.total)} · ${escapeHtml(forecast.text)}</div><h2>Расходы по категориям</h2><table><thead><tr><th>Категория</th><th>Сумма</th><th>Доля</th></tr></thead><tbody>${catRows||'<tr><td colspan="3">Расходов нет</td></tr>'}</tbody></table><h2>Операции и заработок</h2><table><thead><tr><th>Дата</th><th>Тип</th><th>Категория</th><th>Описание</th><th>Сумма</th><th>Комментарий</th></tr></thead><tbody>${txRows||'<tr><td colspan="6">Нет операций</td></tr>'}</tbody></table><div class="footer">Создано приложением «Мой заработок» · ${new Date().toLocaleDateString('ru-RU')}</div><script>window.onload=()=>setTimeout(()=>window.print(),350)</script></body></html>`);w.document.close();toast('PDF-отчёт открыт: выберите «Сохранить в PDF»')}
function smartForecast(d=viewMonth){
 const now=new Date(),same=now.getFullYear()===d.getFullYear()&&now.getMonth()===d.getMonth(),mk=monthKeyForDate(d),all=Object.entries(data.days).flatMap(([date,day])=>(day.entries||[]).map(e=>({date,e,w:work(e.workId)}))).filter(x=>x.w&&x.date<today());
 const actual=entriesForMonth(d).filter(x=>!same||x.date<=today()),actualTotal=actual.reduce((s,x)=>s+earningsOf(x.e,x.w),0);
 if(!same)return {total:actualTotal,text:'Для прошедшего месяца прогноз не нужен.',confidence:'Факт',method:'Завершён'};
 const future=[];const daysIn=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
 for(let day=now.getDate()+1;day<=daysIn;day++){const date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`,marks=Array.isArray(data.calendar[date])?data.calendar[date]:data.calendar[date]&&data.calendar[date]!=='off'?[data.calendar[date]]:[];marks.filter(id=>id!=='off').forEach(workId=>future.push({date,workId,weekday:new Date(date+'T12:00:00').getDay()}))}
 function expected(workId,weekday){const hist=all.filter(x=>x.e.workId===workId),recent=hist.filter(x=>{const diff=(now-new Date(x.date+'T12:00:00'))/86400000;return diff>=0&&diff<=56}),sameWeek=recent.filter(x=>new Date(x.date+'T12:00:00').getDay()===weekday);const avg=a=>a.length?a.reduce((s,x)=>s+earningsOf(x.e,x.w),0)/a.length:0;const a=avg(sameWeek),b=avg(recent),c=avg(hist);return a&&b? a*.6+b*.25+c*.15 : b&&c?b*.7+c*.3:c||b||a||0}
 let planned=future.reduce((s,f)=>s+expected(f.workId,f.weekday),0),method='По графику',confidence=future.length?'Высокая':'Средняя';
 if(!future.length){const weekdayCounts={};all.filter(x=>(now-new Date(x.date+'T12:00:00'))/86400000<=84).forEach(x=>{const wd=new Date(x.date+'T12:00:00').getDay();weekdayCounts[wd]=(weekdayCounts[wd]||0)+1});for(let day=now.getDate()+1;day<=daysIn;day++){const date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`,wd=new Date(date+'T12:00:00').getDay(),cnt=weekdayCounts[wd]||0;if(cnt>=2){const candidates=all.filter(x=>new Date(x.date+'T12:00:00').getDay()===wd);const av=candidates.reduce((s,x)=>s+earningsOf(x.e,x.w),0)/(candidates.length||1);planned+=av}}method='По историческому графику';confidence=all.length>=10?'Средняя':'Низкая'}
 const total=actualTotal+planned;const progress=daysIn?Math.min(1,now.getDate()/daysIn):0;const text=future.length?`Факт ${money(actualTotal)} + ${future.length} заплан. смен · ожидаемо ещё ${money(planned)}.`:`Факт ${money(actualTotal)} + прогноз по вашему историческому ритму ещё ${money(planned)}.`;return {total,text,confidence,method};
}
renderForecast=function(){const f=smartForecast(viewMonth);const v=document.getElementById('forecastValue'),t=document.getElementById('forecastText'),c=document.getElementById('forecastConfidence'),m=document.getElementById('forecastMethod');if(v)v.textContent=money(f.total);if(t)t.textContent=f.text;if(c)c.textContent=f.confidence;if(m)m.textContent=f.method};
function setExportMonthFromDate(d){const e=document.getElementById('exportMonth');if(e)e.value=monthKeyForDate(d)}
setTimeout(()=>{setExportMonthFromDate(new Date());const ex=document.getElementById('exportMonth');if(ex)ex.value=monthKeyForDate(moneyMonthDate);document.getElementById('exportCsvBtn')?.addEventListener('click',exportCSV);document.getElementById('exportExcelBtn')?.addEventListener('click',exportExcel);document.getElementById('exportPdfBtn')?.addEventListener('click',exportPDF)},0);


/* ====================== v21 PRODUCT OVERHAUL ====================== */
const V21_DEFAULT_ACCOUNTS=[{id:'cash',name:'Наличные',icon:'💵',opening:0},{id:'card',name:'Карта',icon:'💳',opening:0}];
let v21TxFilter='all',v21TxQuery='',templateEditingId=null,templateType='expense',accountEditingId=null,recurringEditingId=null,recurringType='expense';
function ensureV21(){
  ensureFinance();
  data.version=21;
  data.accounts=Array.isArray(data.accounts)&&data.accounts.length?data.accounts:[...V21_DEFAULT_ACCOUNTS];
  data.accounts=data.accounts.map(a=>({id:a.id||uid(),name:a.name||'Счёт',icon:a.icon||'💳',opening:Number(a.opening)||0}));
  const ids=new Set(data.accounts.map(a=>a.id));
  data.transactions=data.transactions.map(t=>{
    if(t.type==='transfer')return {...t,fromAccountId:t.fromAccountId||t.accountId||'cash',toAccountId:t.toAccountId||'card',categoryId:'transfer'};
    return {...t,accountId:ids.has(t.accountId)?t.accountId:'cash'};
  });
  data.templates=Array.isArray(data.templates)?data.templates:[];
  data.recurring=Array.isArray(data.recurring)?data.recurring:[];
  data.onboardingDone=!!data.onboardingDone;
  data.undoStack=Array.isArray(data.undoStack)?data.undoStack:[];
  if(!data.templates.length){
    const food=data.expenseCategories.find(c=>/еда/i.test(c.name))?.id||'other';
    data.templates=[{id:uid(),name:'Кофе',type:'expense',amount:250,categoryId:food,accountId:'cash'}];
  }
}
ensureV21();
function accountById(id){return data.accounts.find(a=>a.id===id)||data.accounts[0];}
function accountsOptions(selected=''){return data.accounts.map(a=>`<option value="${a.id}" ${a.id===selected?'selected':''}>${escapeHtml(a.icon||'💳')} ${escapeHtml(a.name)}</option>`).join('');}
function accountBalances(d=moneyMonthDate){
  const balances={};data.accounts.forEach(a=>balances[a.id]=Number(a.opening)||0);
  // Work earnings enter cash/card according to the original shift fields.
  Object.entries(data.days).forEach(([date,day])=>{if(date>d.toISOString().slice(0,7))return;normalizeDayEntries(day).forEach(e=>{if(e.type==='off')return;balances.cash=(balances.cash||0)+(Number(e.cash)||0);balances.card=(balances.card||0)+(Number(e.card)||0);});});
  data.transactions.forEach(t=>{if(t.date>today()&&t.date>monthKeyForDate(d)+'-31')return;if(t.type==='expense')balances[t.accountId]=(balances[t.accountId]||0)-t.amount;if(t.type==='income')balances[t.accountId]=(balances[t.accountId]||0)+t.amount;if(t.type==='transfer'){balances[t.fromAccountId]=(balances[t.fromAccountId]||0)-t.amount;balances[t.toAccountId]=(balances[t.toAccountId]||0)+t.amount;}});
  return balances;
}
function categoryOptions(type,selected=''){return categoryList(type).map(c=>`<option value="${c.id}" ${c.id===selected?'selected':''}>${escapeHtml(c.icon||'•')} ${escapeHtml(c.name)}</option>`).join('');}
function dayTx(date){return data.transactions.filter(t=>t.date===date);}
function financeDaySummary(date=today()){
  const earned=entriesForMonth(dateObj(date)).filter(x=>x.date===date).reduce((s,x)=>s+earningsOf(x.e,x.w),0);
  const tx=dayTx(date);const exp=tx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);const inc=tx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);return {earned:earned+inc,expense:exp,net:earned+inc-exp};
}
function renderHomeFinance(){
  const d=new Date();const inc=monthIncome(d),exp=monthExpenses(d),net=inc-exp,goal=Number(data.goals[monthKey(d)]||0),p=goal?Math.min(100,inc/goal*100):0;
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
  set('homeFinanceMonth',monthLabel(d));set('homeIncome',money(inc));set('homeExpense',money(exp));set('homeNet',money(net));set('homeGoalHint',goal?`${money(inc)} из ${money(goal)} · ${Math.round(p)}% цели`:'Цель месяца не задана');const bar=document.getElementById('homeGoalProgress');if(bar)bar.style.width=p+'%';
}
function renderFinancialDay(){const x=financeDaySummary();const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};set('financialDayDate',new Date().toLocaleDateString('ru-RU',{day:'numeric',month:'short'}));set('financialDayIncome',money(x.earned));set('financialDayExpense',money(x.expense));set('financialDayNet',money(x.net));const hours=entriesForMonth(new Date()).filter(e=>e.date===today()).reduce((s,x)=>s+(Number(x.e.hours)||0),0);set('financialDayWorkTime',x.net?`${hours?humanHours(hours)+' работы · ':''}Итог дня ${money(x.net)}.`:'Запишите смену и расходы, чтобы увидеть итог дня.');}
function renderQuickTemplates(){const box=document.getElementById('templateButtons');if(!box)return;box.innerHTML=data.templates.slice(0,8).map(t=>{const c=txCategory(t.categoryId,t.type);return `<button class="template-btn" data-template="${t.id}"><span>${c.icon||'•'}</span><span>${escapeHtml(t.name)}</span><b>${t.type==='expense'?'−':'+'}${money(t.amount)}</b></button>`}).join('')||'<small class="settings-help">Добавьте шаблон в настройках.</small>';box.querySelectorAll('[data-template]').forEach(b=>b.onclick=()=>applyTemplate(b.dataset.template));}
function applyTemplate(id){const t=data.templates.find(x=>x.id===id);if(!t)return;openTransaction(null,t.type);document.getElementById('txAmount').value=t.amount;document.getElementById('txCategory').value=t.categoryId;document.getElementById('txAccount').value=t.accountId||'cash';updateTxWorkTime();}
function renderTransactionList(){
  const box=document.getElementById('transactionsList');if(!box)return;let tx=monthTransactions(moneyMonthDate).filter(t=>v21TxFilter==='all'||t.type===v21TxFilter);if(v21TxQuery){const q=v21TxQuery.toLowerCase();tx=tx.filter(t=>{const c=txCategory(t.categoryId,t.type);return [c.name,c.icon,t.note,t.date,t.amount].join(' ').toLowerCase().includes(q)})}tx.sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};set('transactionsCount',tx.length);box.innerHTML=tx.length?tx.slice(0,80).map(t=>{const c=t.type==='transfer'?{icon:'↔',name:'Перевод'}:txCategory(t.categoryId,t.type);const amount=t.type==='expense'?'−'+money(t.amount):t.type==='income'?'+'+money(t.amount):money(t.amount);const sub=t.type==='transfer'?`${accountById(t.fromAccountId)?.name||'Счёт'} → ${accountById(t.toAccountId)?.name||'Счёт'}`:`${dateObj(t.date).toLocaleDateString('ru-RU',{day:'numeric',month:'short'})}${t.note?' · '+escapeHtml(t.note):''}`;return `<button class="tx-row" data-tx-edit="${t.id}"><span class="tx-icon">${c.icon||'•'}</span><span class="tx-main"><b>${escapeHtml(c.name)}</b><small>${sub}</small></span><span class="tx-amount ${t.type}">${amount}</span></button>`}).join(''):'<div class="empty-state compact"><b>Ничего не найдено</b><span>Измените поиск или фильтр.</span></div>';box.querySelectorAll('[data-tx-edit]').forEach(b=>b.onclick=()=>openTransaction(b.dataset.txEdit));}
function renderComparison(){const cur=moneyMonthDate,prev=new Date(cur.getFullYear(),cur.getMonth()-1,1);const ci=monthIncome(cur),pi=monthIncome(prev),ce=monthExpenses(cur),pe=monthExpenses(prev),cn=ci-ce,pn=pi-pe;const row=(name,a,b)=>{const diff=b?((a-b)/Math.abs(b))*100:(a?100:0);return `<div class="compare-row"><span>${name}</span><b>${money(a)}</b><small class="${diff>=0?'up':'down'}">${diff>=0?'↑':'↓'} ${Math.abs(Math.round(diff))}%</small></div>`};const box=document.getElementById('monthComparison');if(box)box.innerHTML=row('Доход',ci,pi)+row('Расходы',ce,pe)+row('Осталось',cn,pn);const l=document.getElementById('compareMonthLabel');if(l)l.textContent=monthLabel(prev);}
function renderMoneyV21(){ensureV21();const income=monthIncome(moneyMonthDate),expense=monthExpenses(moneyMonthDate),net=income-expense;const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};set('moneyMonth',monthLabel(moneyMonthDate));set('moneyIncome',money(income));set('moneyExpense',money(expense));set('moneyNet',money(net));const h=expense,wt=workTimeForAmount(h);set('moneyWorkTime',humanHours(wt));set('moneyWorkTimeHint',h?`${money(h)} расходов = примерно ${humanHours(wt)} рабочего времени.`:'Добавьте расход, чтобы увидеть эквивалент.');renderQuickTemplates();renderFinancialDay();renderBudgets();renderTransactionList();renderComparison();}
renderMoney=renderMoneyV21;
function renderAccountsSettings(){const box=document.getElementById('accountList');if(!box)return;const bal=accountBalances();box.innerHTML=data.accounts.map(a=>`<div class="category-setting-row"><span class="category-setting-icon">${a.icon}</span><div class="category-setting-info"><b>${escapeHtml(a.name)}</b><small>Баланс: ${money(bal[a.id]||0)}</small></div><button class="secondary-btn small-btn" data-account-edit="${a.id}">Изменить</button></div>`).join('');box.querySelectorAll('[data-account-edit]').forEach(b=>b.onclick=()=>openAccountEditor(b.dataset.accountEdit));}
function renderTemplateSettings(){const box=document.getElementById('templateSettingsList');if(!box)return;box.innerHTML=data.templates.map(t=>{const c=txCategory(t.categoryId,t.type);return `<div class="category-setting-row"><span class="category-setting-icon">${c.icon||'•'}</span><div class="category-setting-info"><b>${escapeHtml(t.name)}</b><small>${t.type==='expense'?'Расход':'Доход'} · ${money(t.amount)}</small></div><button class="secondary-btn small-btn" data-template-edit="${t.id}">Изменить</button></div>`}).join('');box.querySelectorAll('[data-template-edit]').forEach(b=>b.onclick=()=>openTemplateEditor(b.dataset.templateEdit));}
function renderRecurringSettings(){const box=document.getElementById('recurringList');if(!box)return;box.innerHTML=data.recurring.map(r=>{const c=txCategory(r.categoryId,r.type);return `<div class="category-setting-row"><span class="category-setting-icon">${c.icon||'•'}</span><div class="category-setting-info"><b>${escapeHtml(r.name)}</b><small>${money(r.amount)} · каждый ${r.day} день</small></div><button class="secondary-btn small-btn" data-rec-edit="${r.id}">Изменить</button></div>`}).join('')||'<div class="empty-state compact"><b>Регулярных операций нет</b><span>Добавьте подписки, аренду или регулярные доходы.</span></div>';box.querySelectorAll('[data-rec-edit]').forEach(b=>b.onclick=()=>openRecurringEditor(b.dataset.recEdit));}
const oldRenderSettingsV21=renderSettings;renderSettings=function(){oldRenderSettingsV21();ensureV21();renderAccountsSettings();renderTemplateSettings();renderRecurringSettings();};
function fillAccountSelect(id,selected){const e=document.getElementById(id);if(e)e.innerHTML=accountsOptions(selected);}
function openAccountEditor(id=null){accountEditingId=id;const a=id?accountById(id):null;document.getElementById('accountModalTitle').textContent=a?'Изменить счёт':'Новый счёт';document.getElementById('accountName').value=a?.name||'';document.getElementById('accountIcon').value=a?.icon||'💳';document.getElementById('deleteAccountBtn').classList.toggle('hidden',!a||['cash','card'].includes(a.id));document.getElementById('accountModal').classList.remove('hidden');}
function saveAccount(){const name=document.getElementById('accountName').value.trim();if(!name){toast('Введите название счёта');return}if(accountEditingId){Object.assign(accountById(accountEditingId),{name,icon:document.getElementById('accountIcon').value.trim()||'💳'});}else data.accounts.push({id:uid(),name,icon:document.getElementById('accountIcon').value.trim()||'💳',opening:0});save();document.getElementById('accountModal').classList.add('hidden');renderSettings();renderMoney();toast('Счёт сохранён ✓');accountEditingId=null;}
function deleteAccount(){if(!accountEditingId||['cash','card'].includes(accountEditingId))return;const target=accountEditingId;if(data.transactions.some(t=>t.accountId===target||t.fromAccountId===target||t.toAccountId===target)){toast('Счёт используется в операциях');return}data.accounts=data.accounts.filter(a=>a.id!==target);save();document.getElementById('accountModal').classList.add('hidden');renderSettings();toast('Счёт удалён');accountEditingId=null;}
function fillTemplateCategory(type,selected){const e=document.getElementById('templateCategory');e.innerHTML=categoryOptions(type,selected);}
function openTemplateEditor(id=null){templateEditingId=id;const t=id?data.templates.find(x=>x.id===id):null;templateType=t?.type||'expense';document.getElementById('templateModalTitle').textContent=t?'Изменить шаблон':'Новый шаблон';document.getElementById('templateName').value=t?.name||'';document.getElementById('templateAmount').value=t?.amount||'';fillTemplateCategory(templateType,t?.categoryId);fillAccountSelect('templateAccount',t?.accountId||'cash');document.querySelectorAll('[data-template-type]').forEach(b=>b.classList.toggle('active',b.dataset.templateType===templateType));document.getElementById('deleteTemplateBtn').classList.toggle('hidden',!t);document.getElementById('templateModal').classList.remove('hidden');}
function saveTemplate(){const name=document.getElementById('templateName').value.trim(),amount=Number(String(document.getElementById('templateAmount').value).replace(/\s/g,'').replace(',','.'));if(!name||!amount||amount<=0){toast('Заполните название и сумму');return}const t=templateEditingId?data.templates.find(x=>x.id===templateEditingId):{id:uid()};Object.assign(t,{name,amount,type:templateType,categoryId:document.getElementById('templateCategory').value,accountId:document.getElementById('templateAccount').value});if(!templateEditingId)data.templates.push(t);save();document.getElementById('templateModal').classList.add('hidden');renderSettings();renderMoney();toast('Шаблон сохранён ✓');templateEditingId=null;}
function deleteTemplate(){if(!templateEditingId)return;data.templates=data.templates.filter(x=>x.id!==templateEditingId);save();document.getElementById('templateModal').classList.add('hidden');renderSettings();renderMoney();toast('Шаблон удалён');templateEditingId=null;}
function openRecurringEditor(id=null){recurringEditingId=id;const r=id?data.recurring.find(x=>x.id===id):null;recurringType=r?.type||'expense';document.getElementById('recurringModalTitle').textContent=r?'Изменить регулярную операцию':'Новая регулярная операция';document.getElementById('recurringName').value=r?.name||'';document.getElementById('recurringAmount').value=r?.amount||'';document.getElementById('recurringDay').value=r?.day||1;document.getElementById('recurringCategory').innerHTML=categoryOptions(recurringType,r?.categoryId);fillAccountSelect('recurringAccount',r?.accountId||'cash');document.querySelectorAll('[data-recurring-type]').forEach(b=>b.classList.toggle('active',b.dataset.recurringType===recurringType));document.getElementById('deleteRecurringBtn').classList.toggle('hidden',!r);document.getElementById('recurringModal').classList.remove('hidden');}
function saveRecurring(){const name=document.getElementById('recurringName').value.trim(),amount=Number(String(document.getElementById('recurringAmount').value).replace(/\s/g,'').replace(',','.')),day=Math.max(1,Math.min(31,Number(document.getElementById('recurringDay').value)||1));if(!name||!amount){toast('Заполните название и сумму');return}const r=recurringEditingId?data.recurring.find(x=>x.id===recurringEditingId):{id:uid()};Object.assign(r,{name,amount,type:recurringType,day,categoryId:document.getElementById('recurringCategory').value,accountId:document.getElementById('recurringAccount').value,createdAt:r.createdAt||Date.now(),generatedDates:Array.isArray(r.generatedDates)?r.generatedDates:[]});if(!recurringEditingId)data.recurring.push(r);save();document.getElementById('recurringModal').classList.add('hidden');renderSettings();toast('Регулярная операция сохранена ✓');recurringEditingId=null;}
function deleteRecurring(){if(!recurringEditingId)return;data.recurring=data.recurring.filter(x=>x.id!==recurringEditingId);save();document.getElementById('recurringModal').classList.add('hidden');renderSettings();toast('Регулярная операция удалена');recurringEditingId=null;}
function updateTxAccountUI(){const transfer=txType==='transfer';document.getElementById('txAccountLabel').classList.toggle('hidden',transfer);document.getElementById('transferAccounts').classList.toggle('hidden',!transfer);if(transfer){fillAccountSelect('txFromAccount',document.getElementById('txFromAccount')?.value||'cash');fillAccountSelect('txToAccount',document.getElementById('txToAccount')?.value||'card');}else fillAccountSelect('txAccount',document.getElementById('txAccount')?.value||'cash');}
const oldSetTxTypeV21=setTxType;setTxType=function(type){txType=type;document.querySelectorAll('.tx-type').forEach(b=>{if(b.dataset.txType)b.classList.toggle('active',b.dataset.txType===type)});document.getElementById('transactionEyebrow').textContent=type==='expense'?'РАСХОД':type==='income'?'ДОХОД':'ПЕРЕВОД';document.getElementById('transactionTitle').textContent=txEditingId?'Изменить операцию':type==='expense'?'Новый расход':type==='income'?'Новый доход':'Перевод между счетами';const sel=document.getElementById('txCategory');if(sel)sel.innerHTML=categoryOptions(type==='income'?'income':'expense');if(sel&&!['transfer'].includes(type))sel.value=categoryFor(type,sel.value).id;updateTxAccountUI();updateTxWorkTime();};
const oldOpenTransactionV21=openTransaction;openTransaction=function(id=null,type='expense'){const t=id?data.transactions.find(x=>x.id===id):null;txEditingId=id||null;txType=t?.type||type;document.getElementById('transactionTitle').textContent=t?'Изменить операцию':txType==='expense'?'Новый расход':txType==='income'?'Новый доход':'Перевод между счетами';document.getElementById('transactionEyebrow').textContent=txType==='expense'?'РАСХОД':txType==='income'?'ДОХОД':'ПЕРЕВОД';document.getElementById('txAmount').value=t?.amount??'';document.getElementById('txDate').value=t?.date||today();document.getElementById('txNote').value=t?.note||'';if(t?.type==='transfer'){fillAccountSelect('txFromAccount',t.fromAccountId||'cash');fillAccountSelect('txToAccount',t.toAccountId||'card');}else fillAccountSelect('txAccount',t?.accountId||'cash');setTxType(txType);if(t?.type!=='transfer'){const c=txCategory(t?.categoryId||'',txType);document.getElementById('txCategory').value=c.id;}document.getElementById('deleteTransactionBtn').classList.toggle('hidden',!t);updateTxWorkTime();document.getElementById('transactionModal').classList.remove('hidden');};
function saveTransactionV21(){const amount=Number(String(document.getElementById('txAmount').value).replace(/\s/g,'').replace(',','.'));if(!Number.isFinite(amount)||amount<=0){toast('Введите сумму больше нуля');return}const t=txEditingId?data.transactions.find(x=>x.id===txEditingId):{id:uid(),createdAt:Date.now()};if(txType==='transfer'){const from=document.getElementById('txFromAccount').value,to=document.getElementById('txToAccount').value;if(from===to){toast('Счета перевода должны отличаться');return}Object.assign(t,{type:'transfer',amount,date:document.getElementById('txDate').value||today(),categoryId:'transfer',fromAccountId:from,toAccountId:to,note:document.getElementById('txNote').value.trim()});}else Object.assign(t,{type:txType,amount,date:document.getElementById('txDate').value||today(),categoryId:document.getElementById('txCategory').value,accountId:document.getElementById('txAccount').value,note:document.getElementById('txNote').value.trim()});if(!txEditingId)data.transactions.push(t);save();closeTransaction();renderAll();showScreen('money');toast(txEditingId?'Операция изменена ✓':'Операция сохранена ✓');}
saveTransaction=saveTransactionV21;
function deleteTransactionV21(){if(!txEditingId)return;if(!confirm('Удалить операцию?'))return;const old=JSON.parse(JSON.stringify(data.transactions.find(t=>t.id===txEditingId)));data.undoStack=[old,...data.undoStack].slice(0,5);data.transactions=data.transactions.filter(t=>t.id!==txEditingId);save();closeTransaction();renderAll();showScreen('money');toast('Операция удалена · Отменить в течение 5 сек');clearTimeout(window.__undo);window.__undo=setTimeout(()=>{data.undoStack.shift();save()},5000);const t=document.getElementById('toast');t.onclick=()=>{const x=data.undoStack.shift();if(x){data.transactions.push(x);save();renderAll();showScreen('money');toast('Удаление отменено ✓')}};}
deleteTransaction=deleteTransactionV21;
function renderBudgetsV21(){const m=monthKey(moneyMonthDate),bud=data.budgets[m]||{},spent={};monthTransactions(moneyMonthDate).filter(t=>t.type==='expense').forEach(t=>spent[t.categoryId]=(spent[t.categoryId]||0)+t.amount);const box=document.getElementById('budgetList');if(!box)return;const ids=Object.keys(bud).filter(id=>Number(bud[id])>0);box.innerHTML=ids.length?ids.map(id=>{const c=txCategory(id,'expense'),limit=Number(bud[id]),v=spent[id]||0,p=Math.min(100,v/limit*100),days=new Date(moneyMonthDate.getFullYear(),moneyMonthDate.getMonth()+1,0).getDate(),elapsed=(new Date().getFullYear()===moneyMonthDate.getFullYear()&&new Date().getMonth()===moneyMonthDate.getMonth())?Math.max(1,new Date().getDate()):days,remain=Math.max(0,days-elapsed),daily=remain?Math.max(0,(limit-v)/remain):0;return `<div class="budget-row"><div><b>${c.icon} ${escapeHtml(c.name)}</b><br><small>${money(v)} из ${money(limit)} · ${remain?money(daily)+'/день':''}</small></div><b>${Math.round(p)}%</b><div class="budget-progress ${v>limit?'over':''}"><i style="width:${p}%"></i></div></div>`}).join(''):'<div class="empty-state compact"><b>Бюджеты не заданы</b><span>Настройте лимиты по категориям.</span></div>';}
renderBudgets=renderBudgetsV21;
function renderScenario(){const box=document.getElementById('scenarioList');if(!box)return;const f=smartForecast(viewMonth),base=f.total;const avg=entriesForMonth(new Date()).filter(x=>x.date<today()).length?entriesForMonth(new Date()).filter(x=>x.date<today()).reduce((s,x)=>s+earningsOf(x.e,x.w),0)/entriesForMonth(new Date()).filter(x=>x.date<today()).length:(activeWork()?.formula?.rate||0)*8;const scenarios=[{n:'+1 смена',v:base+avg},{n:'+3 смены',v:base+avg*3},{n:'−2 смены',v:Math.max(0,base-avg*2)}];box.innerHTML=scenarios.map(x=>`<div class="scenario-row"><span>${x.n}</span><b>${money(x.v)}</b></div>`).join('');const b=document.getElementById('scenarioBase');if(b)b.textContent=`База ${money(base)}`;}
const oldRenderFinanceStatsV21=renderFinanceStats;renderFinanceStats=function(){oldRenderFinanceStatsV21();renderScenario();};
function smartForecastV21(d=viewMonth){
 const now=new Date(),same=now.getFullYear()===d.getFullYear()&&now.getMonth()===d.getMonth();const actual=entriesForMonth(d).filter(x=>!same||x.date<=today()),actualTotal=actual.reduce((s,x)=>s+earningsOf(x.e,x.w),0);if(!same)return {total:actualTotal,text:'Месяц завершён: используется фактический заработок.',confidence:'Факт',method:'Фактические данные',low:actualTotal,high:actualTotal};
 const daysIn=new Date(d.getFullYear(),d.getMonth()+1,0).getDate(),future=[];for(let day=now.getDate()+1;day<=daysIn;day++){const date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`,marks=Array.isArray(data.calendar[date])?data.calendar[date]:[];marks.filter(id=>id&&id!=='off').forEach(workId=>future.push({date,workId,weekday:new Date(date+'T12:00:00').getDay()}));}
 const all=Object.entries(data.days).flatMap(([date,day])=>normalizeDayEntries(day).map(e=>({date,e,w:work(e.workId)}))).filter(x=>x.w&&x.date<today());
 function stats(workId,wd){const h=all.filter(x=>x.e.workId===workId&&new Date(x.date+'T12:00:00').getDay()===wd),r=all.filter(x=>x.e.workId===workId&&((now-new Date(x.date+'T12:00:00'))/86400000)<=84),allW=all.filter(x=>x.e.workId===workId);const av=a=>a.length?a.reduce((s,x)=>s+earningsOf(x.e,x.w),0)/a.length:0;const mean=av(h)*.55+av(r)*.3+av(allW)*.15;const values=(h.length?h:r).map(x=>earningsOf(x.e,x.w));const variance=values.length?values.reduce((s,v)=>s+(v-mean)**2,0)/values.length:0;return {mean,sd:Math.sqrt(variance),n:values.length};}
 let planned=0,variance=0;future.forEach(f=>{const s=stats(f.workId,f.weekday);planned+=s.mean;variance+=s.sd*s.sd;});
 if(!future.length){const byWd={};all.filter(x=>((now-new Date(x.date+'T12:00:00'))/86400000)<=84).forEach(x=>{const wd=new Date(x.date+'T12:00:00').getDay();(byWd[wd]??=[]).push(earningsOf(x.e,x.w));});for(let day=now.getDate()+1;day<=daysIn;day++){const wd=new Date(d.getFullYear(),d.getMonth(),day).getDay(),a=byWd[wd]||[];if(a.length){const mean=a.reduce((s,v)=>s+v,0)/a.length;planned+=mean;variance+=a.reduce((s,v)=>s+(v-mean)**2,0)/(a.length||1);}}}
 const total=actualTotal+planned,sd=Math.sqrt(variance),low=Math.max(actualTotal,total-sd*0.85),high=total+sd*0.85,confidence=future.length&&future.length>=3?'Высокая':all.length>=10?'Средняя':'Низкая',method=future.length?'График + день недели + 84 дня истории':'Исторический ритм + день недели';return {total,low,high,confidence,method,text:`Факт ${money(actualTotal)} + ожидаемо ${money(planned)}. Диапазон ${money(low)}–${money(high)}.`};}
smartForecast=smartForecastV21;
renderForecast=function(){const f=smartForecast(viewMonth);const v=document.getElementById('forecastValue'),t=document.getElementById('forecastText'),c=document.getElementById('forecastConfidence'),m=document.getElementById('forecastMethod');if(v)v.textContent=money(f.total);if(t)t.textContent=f.text;if(c)c.textContent=f.confidence;if(m)m.textContent=f.method;};
// Extend the export rows with transfers and accounts.
const oldExportRowsV21=exportRows;exportRows=function(d){const rows=oldExportRowsV21(d);monthTransactions(d).filter(t=>t.type==='transfer').forEach(t=>rows.push({Дата:t.date,Тип:'Перевод',Категория:'Перевод',Описание:`${accountById(t.fromAccountId)?.name||'Счёт'} → ${accountById(t.toAccountId)?.name||'Счёт'}`,Наличные:'',Безнал:'',Часы:'',Сумма:t.amount,Счёт:'',Комментарий:t.note||''}));return rows.sort((a,b)=>a.Дата.localeCompare(b.Дата));};
// Recurring operations can be materialized for the selected month once, without duplicating existing entries.
function materializeRecurring(d=moneyMonthDate){const mk=monthKeyForDate(d);let added=0;data.recurring.forEach(r=>{const day=Math.min(r.day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()),date=`${mk}-${String(day).padStart(2,'0')}`;const exists=data.transactions.some(t=>t.date===date&&t.recurringId===r.id);if(!exists){data.transactions.push({id:uid(),createdAt:Date.now(),type:r.type,amount:r.amount,date,categoryId:r.categoryId,accountId:r.accountId,note:`Регулярно: ${r.name}`,recurringId:r.id});added++;}});if(added){save();toast(`Добавлено регулярных операций: ${added}`);renderMoney();}}
// Search, filters and dynamic selects.
document.getElementById('txSearch')?.addEventListener('input',e=>{v21TxQuery=e.target.value.trim();renderTransactionList()});document.querySelectorAll('[data-tx-filter]').forEach(b=>b.onclick=()=>{v21TxFilter=b.dataset.txFilter;document.querySelectorAll('[data-tx-filter]').forEach(x=>x.classList.toggle('active',x===b));renderTransactionList()});
document.getElementById('manageTemplatesBtn')?.addEventListener('click',()=>showScreen('settings'));document.getElementById('addAccountBtn')?.addEventListener('click',()=>openAccountEditor());document.getElementById('saveAccountBtn')?.addEventListener('click',saveAccount);document.getElementById('deleteAccountBtn')?.addEventListener('click',deleteAccount);document.getElementById('closeAccountModal')?.addEventListener('click',()=>document.getElementById('accountModal').classList.add('hidden'));document.querySelector('#accountModal .modal-backdrop')?.addEventListener('click',()=>document.getElementById('accountModal').classList.add('hidden'));
document.getElementById('addTemplateBtn')?.addEventListener('click',()=>openTemplateEditor());document.getElementById('saveTemplateBtn')?.addEventListener('click',saveTemplate);document.getElementById('deleteTemplateBtn')?.addEventListener('click',deleteTemplate);document.getElementById('closeTemplateModal')?.addEventListener('click',()=>document.getElementById('templateModal').classList.add('hidden'));document.querySelector('#templateModal .modal-backdrop')?.addEventListener('click',()=>document.getElementById('templateModal').classList.add('hidden'));document.querySelectorAll('[data-template-type]').forEach(b=>b.onclick=()=>{templateType=b.dataset.templateType;fillTemplateCategory(templateType);document.querySelectorAll('[data-template-type]').forEach(x=>x.classList.toggle('active',x===b))});
document.getElementById('addRecurringBtn')?.addEventListener('click',()=>openRecurringEditor());document.getElementById('saveRecurringBtn')?.addEventListener('click',saveRecurring);document.getElementById('deleteRecurringBtn')?.addEventListener('click',deleteRecurring);document.getElementById('closeRecurringModal')?.addEventListener('click',()=>document.getElementById('recurringModal').classList.add('hidden'));document.querySelector('#recurringModal .modal-backdrop')?.addEventListener('click',()=>document.getElementById('recurringModal').classList.add('hidden'));document.querySelectorAll('[data-recurring-type]').forEach(b=>b.onclick=()=>{recurringType=b.dataset.recurringType;document.getElementById('recurringCategory').innerHTML=categoryOptions(recurringType);document.querySelectorAll('[data-recurring-type]').forEach(x=>x.classList.toggle('active',x===b))});
document.getElementById('addExpenseBtn').onclick=()=>openTransaction(null,'expense');document.getElementById('addIncomeBtn').onclick=()=>openTransaction(null,'income');
// Rebind transaction type buttons including transfer.
document.querySelectorAll('[data-tx-type]').forEach(b=>b.onclick=()=>setTxType(b.dataset.txType));
// On first launch, show a short setup instead of throwing the entire settings universe at the user.
function maybeOnboard(){if(data.onboardingDone||data.days&&Object.keys(data.days).length||data.transactions&&data.transactions.length)return;document.getElementById('onboardingModal')?.classList.remove('hidden');}
function finishOnboarding(){const name=document.getElementById('onboardName').value.trim();const rate=Number(String(document.getElementById('onboardRate').value).replace(/\s/g,'').replace(',','.'))||250;const workName=document.getElementById('onboardWork').value.trim()||'Основная работа';data.user.name=name;const w=data.works[0]||makeWork(workName,'#4f67df');w.name=workName;w.formula.rate=rate;const goal=Number(String(document.getElementById('onboardGoal').value).replace(/\s/g,'').replace(',','.'));if(goal>0)data.goals[monthKey()]=goal;data.onboardingDone=true;save();document.getElementById('onboardingModal').classList.add('hidden');renderAll();toast('Готово. Приложение настроено ✓');}
document.getElementById('finishOnboardingBtn')?.addEventListener('click',finishOnboarding);
// Materialize current month's recurring items when the Money screen is opened.
const oldShowScreenV21=showScreen;showScreen=function(s){oldShowScreenV21(s);if(s==='money'){materializeRecurring();renderMoneyV21();}if(s==='settings'){renderSettings();}};
// Use a consistent local-first save after migration.
ensureV21();save();renderAll();renderMoneyV21();renderHomeFinance();maybeOnboard();
setTimeout(()=>{if(document.getElementById('onboardingModal')?.classList.contains('hidden')){}},50);


/* v21 workplace analytics filter */
let statsWorkFilter='all';
function renderStatsWorkFilter(){const e=document.getElementById('statsWorkFilter');if(!e)return;e.innerHTML='<option value="all">Все места</option>'+data.works.map(w=>`<option value="${w.id}">${escapeHtml(w.name)}</option>`).join('');e.value=statsWorkFilter;e.onchange=()=>{statsWorkFilter=e.value;renderStats();};}
const baseRenderStatsV21=renderStats;renderStats=function(){renderStatsWorkFilter();baseRenderStatsV21();if(statsWorkFilter==='all')return;const es=entriesForMonth(statsMonth).filter(x=>x.e.workId===statsWorkFilter);const total=es.reduce((s,x)=>s+earningsOf(x.e,x.w),0),hours=es.reduce((s,x)=>s+(Number(x.e.hours)||0),0),days=new Set(es.map(x=>x.date)).size;const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};set('avgShift',money(days?total/days:0));set('avgHour',money(hours?total/hours:0));set('commissionTotal',money(es.reduce((s,x)=>{const c=(Number(x.e.cash)||0)+(Number(x.e.card)||0);return s+c*(Number(x.e.formulaSnapshot?.percent)||0)/100},0)));const best=es.reduce((a,x)=>{const n=earningsOf(x.e,x.w);return !a||n>a.n?{date:x.date,n}:a},null);set('bestDay',best?`${dateObj(best.date).toLocaleDateString('ru-RU',{day:'numeric',month:'long'})} · ${money(best.n)}`:'—');};

/* ====================== v22 PAYOUTS / BALANCES / RECURRING FIX ====================== */
const V22_DEFAULT_PAYOUTS=[];
let payoutEditingId=null,payoutType='salary';
function ensureV22(){
  ensureV21();
  data.version=22;
  data.salaryPayouts=Array.isArray(data.salaryPayouts)?data.salaryPayouts:V22_DEFAULT_PAYOUTS.slice();
  data.salaryPayouts=data.salaryPayouts.filter(p=>p&&p.id).map(p=>({
    id:p.id,date:p.date||today(),periodMonth:p.periodMonth||monthKeyForDate(new Date()),type:p.type==='advance'?'advance':'salary',amount:Math.max(0,Number(p.amount)||0),accountId:p.accountId||'cash',note:p.note||'',createdAt:p.createdAt||Date.now()
  }));
  data.accounts=data.accounts.map(a=>({
    ...a,
    opening:Number(a.opening)||0,
    balanceSetAt:a.balanceSetAt||null,
    balance:Number.isFinite(Number(a.balance))?Number(a.balance):null,
    balanceSetAtTs:Number(a.balanceSetAtTs)||0
  }));
  data.recurring=data.recurring.map(r=>({...r,createdAt:Number(r.createdAt)||0,generatedDates:Array.isArray(r.generatedDates)?r.generatedDates:[]}));
}
ensureV22();

function eventStartDate(account){return account.balanceSetAt||null;}
function accountBalancesV22(){
  const balances={};
  data.accounts.forEach(a=>balances[a.id]=a.balance!=null&&a.balanceSetAt?Number(a.balance):Number(a.opening)||0);
  const cutoff={};
  data.accounts.forEach(a=>{cutoff[a.id]=a.balanceSetAt||null});
  const include=(accountId,date)=>{const c=cutoff[accountId];return !c||date>c};
  Object.entries(data.days).forEach(([date,day])=>{
    normalizeDayEntries(day).forEach(e=>{
      if(e.type==='off')return;
      const cash=Number(e.cash)||0,card=Number(e.card)||0;
      if(include('cash',date))balances.cash=(balances.cash||0)+cash;
      if(include('card',date))balances.card=(balances.card||0)+card;
    });
  });
  data.transactions.forEach(t=>{
    if(t.type==='transfer'){
      if(include(t.fromAccountId,t.date))balances[t.fromAccountId]=(balances[t.fromAccountId]||0)-Number(t.amount||0);
      if(include(t.toAccountId,t.date))balances[t.toAccountId]=(balances[t.toAccountId]||0)+Number(t.amount||0);
      return;
    }
    if(include(t.accountId,t.date))balances[t.accountId]=(balances[t.accountId]||0)+(t.type==='expense'?-1:1)*Number(t.amount||0);
  });
  data.salaryPayouts.forEach(p=>{if(include(p.accountId,p.date))balances[p.accountId]=(balances[p.accountId]||0)+Number(p.amount||0)});
  return balances;
}
accountBalances=accountBalancesV22;

function currentAccountBalance(id){return Number(accountBalancesV22()[id]||0)}
function openAccountEditorV22(id=null){
  accountEditingId=id;
  const a=id?accountById(id):null;
  document.getElementById('accountModalTitle').textContent=a?'Изменить счёт':'Новый счёт';
  document.getElementById('accountName').value=a?.name||'';
  document.getElementById('accountIcon').value=a?.icon||'💳';
  document.getElementById('accountBalance').value=a?String(currentAccountBalance(id)):'0';
  document.getElementById('accountBalanceHint').textContent=a?'Это фактическая сумма, которая находится на счёте сейчас. Сохранение установит её новой точкой отсчёта.':'Укажите стартовый баланс, который сейчас находится на счёте.';
  document.getElementById('deleteAccountBtn').classList.toggle('hidden',!a||['cash','card'].includes(a.id));
  document.getElementById('accountModal').classList.remove('hidden');
}
openAccountEditor=openAccountEditorV22;
function saveAccountV22(){
  const name=document.getElementById('accountName').value.trim();
  const balance=Number(String(document.getElementById('accountBalance').value||'0').replace(/\s/g,'').replace(',','.'));
  if(!name){toast('Введите название счёта');return}
  if(!Number.isFinite(balance)||balance<0){toast('Введите корректный баланс');return}
  const icon=document.getElementById('accountIcon').value.trim()||'💳';
  if(accountEditingId){
    const a=accountById(accountEditingId);
    Object.assign(a,{name,icon,balance,balanceSetAt:today(),balanceSetAtTs:Date.now()});
  }else data.accounts.push({id:uid(),name,icon,opening:balance,balance,balanceSetAt:today(),balanceSetAtTs:Date.now()});
  save();document.getElementById('accountModal').classList.add('hidden');renderAll();toast('Счёт сохранён ✓');accountEditingId=null;
}
document.getElementById('saveAccountBtn').onclick=saveAccountV22;

function salaryPeriodDefault(type){
  const d=new Date();
  if(type==='salary' && d.getDate()<=15)return new Date(d.getFullYear(),d.getMonth()-1,1);
  return new Date(d.getFullYear(),d.getMonth(),1);
}
function salaryAccrued(period){return entriesForMonth(period).reduce((s,x)=>s+earningsOf(x.e,x.w),0)}
function salaryPaid(period){const m=monthKeyForDate(period);return data.salaryPayouts.filter(p=>p.periodMonth===m).reduce((s,p)=>s+Number(p.amount||0),0)}
function openPayoutEditor(type='salary',id=null){
  payoutEditingId=id;
  const p=id?data.salaryPayouts.find(x=>x.id===id):null;
  payoutType=p?.type||type;
  const period=p?parseMonthInput(p.periodMonth):salaryPeriodDefault(payoutType);
  document.getElementById('payoutModalTitle').textContent=p?'Изменить выплату':payoutType==='advance'?'Вывести аванс':'Вывести зарплату';
  document.getElementById('payoutAmount').value=p?.amount||'';
  document.getElementById('payoutDate').value=p?.date||today();
  document.getElementById('payoutPeriod').value=p?.periodMonth||monthKeyForDate(period);
  fillAccountSelect('payoutAccount',p?.accountId||'cash');
  document.getElementById('payoutNote').value=p?.note||'';
  document.getElementById('deletePayoutBtn').classList.toggle('hidden',!p);
  document.querySelectorAll('[data-payout-type]').forEach(b=>b.classList.toggle('active',b.dataset.payoutType===payoutType));
  const accrued=salaryAccrued(period),paid=salaryPaid(period)-(p?.amount||0),due=Math.max(0,accrued-paid);
  document.getElementById('payoutHint').textContent=`За ${monthLabel(period)} начислено ${money(accrued)}, уже выплачено ${money(paid)}. Укажите фактически полученную сумму.`;
  document.getElementById('payoutModal').classList.remove('hidden');
}
function savePayout(){
  const amount=Number(String(document.getElementById('payoutAmount').value||'').replace(/\s/g,'').replace(',','.'));
  if(!Number.isFinite(amount)||amount<=0){toast('Введите сумму выплаты');return}
  const p=payoutEditingId?data.salaryPayouts.find(x=>x.id===payoutEditingId):{id:uid(),createdAt:Date.now()};
  Object.assign(p,{type:payoutType,amount,date:document.getElementById('payoutDate').value||today(),periodMonth:document.getElementById('payoutPeriod').value||monthKeyForDate(new Date()),accountId:document.getElementById('payoutAccount').value,note:document.getElementById('payoutNote').value.trim()});
  if(!payoutEditingId)data.salaryPayouts.push(p);
  save();document.getElementById('payoutModal').classList.add('hidden');payoutEditingId=null;renderAll();toast('Выплата сохранена ✓');
}
function deletePayout(){if(!payoutEditingId)return;if(!confirm('Удалить выплату?'))return;data.salaryPayouts=data.salaryPayouts.filter(p=>p.id!==payoutEditingId);payoutEditingId=null;save();document.getElementById('payoutModal').classList.add('hidden');renderAll();toast('Выплата удалена');}
function renderSalary(){
  const period=moneyMonthDate,accrued=salaryAccrued(period),paid=salaryPaid(period),due=Math.max(0,accrued-paid);
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
  set('salaryPeriodLabel',monthLabel(period));set('salaryAccrued',money(accrued));set('salaryPaid',money(paid));set('salaryDue',money(due));
  const box=document.getElementById('salaryPayoutList');if(!box)return;
  const ps=data.salaryPayouts.filter(p=>p.periodMonth===monthKeyForDate(period)).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);
  box.innerHTML=ps.length?ps.map(p=>`<button class="salary-payout-row" data-payout-edit="${p.id}"><span><b>${p.type==='advance'?'Аванс':'Зарплата'}</b><small>${dateObj(p.date).toLocaleDateString('ru-RU',{day:'numeric',month:'short'})} · ${escapeHtml(accountById(p.accountId)?.name||'Счёт')}</small></span><strong>${money(p.amount)}</strong></button>`).join(''):'<small class="settings-help">Выплат за этот месяц пока нет.</small>';
  box.querySelectorAll('[data-payout-edit]').forEach(b=>b.onclick=()=>openPayoutEditor('salary',b.dataset.payoutEdit));
}

function renderHomeFinanceV22(){
  const d=new Date(),inc=entriesForMonth(d).filter(x=>x.date<=today()).reduce((s,x)=>s+earningsOf(x.e,x.w),0)+monthTransactions(d).filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0),exp=monthExpenses(d),net=inc-exp,goal=Number(data.goals[monthKey(d)]||0),p=goal?Math.min(100,inc/goal*100):0;
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
  set('homeFinanceMonth',monthLabel(d));set('homeIncome',money(inc));set('homeExpense',money(exp));set('homeNet',money(net));set('homeGoalHint',goal?`${money(inc)} из ${money(goal)} · ${Math.round(p)}% цели`:'Цель месяца не задана');const bar=document.getElementById('homeGoalProgress');if(bar)bar.style.width=p+'%';
}
renderHomeFinance=renderHomeFinanceV22;

function materializeRecurringV22(d=new Date()){
  const todayStr=today(),mk=monthKeyForDate(d),lastDay=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();let added=0;
  data.recurring.forEach(r=>{
    const day=Math.min(Number(r.day)||1,lastDay),date=`${mk}-${String(day).padStart(2,'0')}`,createdDate=r.createdAt?iso(new Date(r.createdAt)):null;
    if(date>todayStr||r.generatedDates.includes(date)||(createdDate&&date<createdDate))return;
    const exists=data.transactions.some(t=>t.recurringId===r.id&&t.date===date);
    if(!exists){data.transactions.push({id:uid(),createdAt:Date.now(),type:r.type,amount:r.amount,date,categoryId:r.categoryId,accountId:r.accountId,note:`Регулярно: ${r.name}`,recurringId:r.id});added++;}
    r.generatedDates.push(date);
  });
  if(added)save();
  return added;
}
materializeRecurring=materializeRecurringV22;

// A recurring item is materialized only when its calendar date has arrived.
const __oldShowScreenV22=showScreen;
showScreen=function(s){__oldShowScreenV22(s);if(s==='money'){const added=materializeRecurringV22(new Date());if(added)toast(`Добавлено регулярных операций: ${added}`);renderMoneyV21();renderSalary();}if(s==='settings')renderSettings();};

// Make the home financial widget refresh after every full render and every saved shift.
const __oldRenderAllV22=renderAll;
renderAll=function(){ensureV22();__oldRenderAllV22();renderHomeFinanceV22();renderSalary();};

// Salary actions and payout modal.
document.getElementById('advanceBtn')?.addEventListener('click',()=>openPayoutEditor('advance'));
document.getElementById('salaryBtn')?.addEventListener('click',()=>openPayoutEditor('salary'));
document.getElementById('savePayoutBtn')?.addEventListener('click',savePayout);
document.getElementById('deletePayoutBtn')?.addEventListener('click',deletePayout);
document.getElementById('closePayoutModal')?.addEventListener('click',()=>document.getElementById('payoutModal').classList.add('hidden'));
document.querySelector('#payoutModal .modal-backdrop')?.addEventListener('click',()=>document.getElementById('payoutModal').classList.add('hidden'));
document.querySelectorAll('[data-payout-type]').forEach(b=>b.onclick=()=>{payoutType=b.dataset.payoutType;openPayoutEditor(payoutType,payoutEditingId)});
document.getElementById('payoutPeriod')?.addEventListener('change',()=>{const p=parseMonthInput(document.getElementById('payoutPeriod').value);const accrued=salaryAccrued(p),paid=salaryPaid(p)-(payoutEditingId?Number(data.salaryPayouts.find(x=>x.id===payoutEditingId)?.amount||0):0);document.getElementById('payoutHint').textContent=`За ${monthLabel(p)} начислено ${money(accrued)}, уже выплачено ${money(Math.max(0,paid))}. Укажите фактически полученную сумму.`});

document.getElementById('accountBalance')?.addEventListener('blur',e=>formatMoneyInput(e.target));

data.version=22;save();renderAll();
