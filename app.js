const { useState, useMemo, useEffect } = React;

const ACCENT = "#1D9E75";
const ACCENT_LIGHT = "#E1F5EE";
const ACCENT_DARK = "#085041";
const COLORS = ["#1D9E75","#7F77DD","#D4537E","#378ADD","#BA7517","#D85A30"];
const DAYS_SHORT = ["L","M","M","G","V","S","D"];
const MONTHS = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

const toKey = d => {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth()+1).padStart(2,"0");
  const day = String(x.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
};
const todayKey = toKey(new Date());

function getWeekDates(offset = 0) {
  const d = new Date(); d.setHours(12,0,0,0);
  d.setDate(d.getDate() + offset * 7);
  const day = d.getDay();
  const mon = new Date(d); mon.setDate(d.getDate() - ((day + 6) % 7));
  return Array.from({length:7}, (_,i) => { const x = new Date(mon); x.setDate(mon.getDate()+i); return x; });
}

function getMonthDates(offset = 0) {
  const d = new Date(); d.setHours(12,0,0,0); d.setDate(1); d.setMonth(d.getMonth() + offset);
  const last = new Date(d.getFullYear(), d.getMonth()+1, 0);
  const dates = [];
  for (let x = new Date(d); x <= last; x.setDate(x.getDate()+1)) dates.push(new Date(x));
  return dates;
}

const INIT_HABITS = [
  { id:1, name:"Bere 2L d'acqua", emoji:"💧" },
  { id:2, name:"30 min esercizio", emoji:"🏃" },
  { id:3, name:"Leggere", emoji:"📚" },
  { id:4, name:"Meditazione", emoji:"🧘" },
];

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

function App() {
  const [page, setPage] = useState("habits");
  const [habits, setHabits] = useState(() => load("habits", INIT_HABITS));
  const [events, setEvents] = useState(() => load("events", []));
  const [checked, setChecked] = useState(() => load("checked", {}));
  const [weekOff, setWeekOff] = useState(0);
  const [selectedDay, setSelectedDay] = useState(todayKey);
  const [reportPeriod, setReportPeriod] = useState("week");
  const [reportOff, setReportOff] = useState(0);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("⭐");
  const [newType, setNewType] = useState("daily");
  const [newDate, setNewDate] = useState(todayKey);

  useEffect(() => save("habits", habits), [habits]);
  useEffect(() => save("events", events), [events]);
  useEffect(() => save("checked", checked), [checked]);

  const weekDates = useMemo(() => getWeekDates(weekOff), [weekOff]);

  // when navigating weeks, if selected day not in current week, reset to first day of week
  useEffect(() => {
    const keys = weekDates.map(d => toKey(d));
    if (!keys.includes(selectedDay)) setSelectedDay(keys.includes(todayKey) ? todayKey : keys[0]);
  }, [weekOff]);

  const toggle = (id, dk) => setChecked(p => ({...p, [`${id}_${dk}`]: !p[`${id}_${dk}`]}));
  const isDone = (id, dk) => !!checked[`${id}_${dk}`];

  const streak = id => {
    let s = 0, d = new Date(); d.setHours(0,0,0,0);
    while (isDone(id, toKey(d))) { s++; d.setDate(d.getDate()-1); }
    return s;
  };

  const selectedDone = habits.filter(h => isDone(h.id, selectedDay)).length;
  const isToday = selectedDay === todayKey;

  const selectedDateObj = new Date(selectedDay + "T12:00:00");
  const selectedLabel = isToday
    ? "Oggi"
    : selectedDateObj.toLocaleDateString("it", { weekday:"long", day:"numeric", month:"long" });

  const addItem = () => {
    if (!newName.trim()) return;
    if (newType === "event") setEvents(p => [...p, { id: Date.now(), name: newName.trim(), emoji: newEmoji, date: newDate }]);
    else setHabits(p => [...p, { id: Date.now(), name: newName.trim(), emoji: newEmoji }]);
    setNewName(""); setNewEmoji("⭐"); setAdding(false);
  };

  const removeHabit = id => setHabits(p => p.filter(h => h.id !== id));
  const removeEvent = id => setEvents(p => p.filter(e => e.id !== id));

  const weekLabel = () => {
    if (weekOff===0) return "Questa settimana";
    if (weekOff===-1) return "Settimana scorsa";
    if (weekOff===1) return "Prossima settimana";
    const d = weekDates[0];
    return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)}`;
  };

  const reportDates = reportPeriod==="week" ? getWeekDates(reportOff) : getMonthDates(reportOff);
  const reportLabel = () => {
    if (reportPeriod==="week") {
      if (reportOff===0) return "Questa settimana";
      if (reportOff===-1) return "Settimana scorsa";
      const d = reportDates[0]; return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)}`;
    } else {
      const d = reportDates[0];
      if (reportOff===0) return "Questo mese";
      if (reportOff===-1) return "Mese scorso";
      return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    }
  };

  const pastDates = reportDates.filter(d => toKey(d) <= todayKey);
  const totalSlots = pastDates.length * habits.length;
  const totalDone = habits.reduce((a,h) => a + pastDates.filter(d => isDone(h.id, toKey(d))).length, 0);
  const globalRate = totalSlots > 0 ? Math.round(totalDone / totalSlots * 100) : 0;
  const habitRate = id => {
    if (!pastDates.length) return 0;
    return Math.round(pastDates.filter(d => isDone(id, toKey(d))).length / pastDates.length * 100);
  };

  const pct = habits.length > 0 ? selectedDone / habits.length : 0;
  const r = 22, circ = Math.round(2 * Math.PI * r);

  return React.createElement("div", { style: { display:"flex", flexDirection:"column", minHeight:"100dvh", background:"#f2f2f7" } },

    // ── PAGE: HABITS ──
    page === "habits" && React.createElement("div", { style: { flex:1, overflowY:"auto", paddingBottom:80 } },

      // Header
      React.createElement("div", { style: { background:"#fff", padding:"60px 20px 16px" } },
        React.createElement("div", { style: { fontSize:13, color:"#8e8e93", marginBottom:4, textTransform:"capitalize" } }, selectedLabel),
        React.createElement("div", { style: { fontSize:26, fontWeight:700, color:"#1c1c1e", marginBottom:16 } }, "Le mie abitudini"),

        // Progress ring card
        React.createElement("div", { style: { background:ACCENT_LIGHT, borderRadius:18, padding:"14px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" } },
          React.createElement("div", null,
            React.createElement("div", { style: { fontSize:12, color:ACCENT_DARK, marginBottom:2 } },
              isToday ? "Completate oggi" : "Completate quel giorno"
            ),
            React.createElement("div", { style: { fontSize:26, fontWeight:700, color:ACCENT_DARK } },
              selectedDone,
              React.createElement("span", { style: { fontSize:15, fontWeight:400 } }, ` / ${habits.length}`)
            )
          ),
          React.createElement("svg", { width:52, height:52, viewBox:"0 0 52 52" },
            React.createElement("circle", { cx:26, cy:26, r, fill:"none", stroke:ACCENT+"40", strokeWidth:4 }),
            React.createElement("circle", { cx:26, cy:26, r, fill:"none", stroke:ACCENT, strokeWidth:4,
              strokeDasharray:`${Math.round(circ * pct)} ${circ}`, strokeLinecap:"round", transform:"rotate(-90 26 26)" }),
            React.createElement("text", { x:26, y:31, textAnchor:"middle", fontSize:12, fontWeight:"600", fill:ACCENT_DARK },
              `${Math.round(pct*100)}%`)
          )
        )
      ),

      // Week nav + day selector
      React.createElement("div", { style: { background:"#fff", marginTop:1, padding:"12px 20px 16px" } },
        React.createElement("div", { style: { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 } },
          React.createElement("button", { onClick:()=>setWeekOff(w=>w-1), style: { background:"none", border:"none", cursor:"pointer", fontSize:20, color:"#8e8e93", padding:"4px 8px" } }, "‹"),
          React.createElement("span", { style: { fontSize:14, fontWeight:500, color:"#1c1c1e" } }, weekLabel()),
          React.createElement("button", { onClick:()=>setWeekOff(w=>w+1), style: { background:"none", border:"none", cursor:"pointer", fontSize:20, color:"#8e8e93", padding:"4px 8px" } }, "›")
        ),

        // Day dots — now tappable
        React.createElement("div", { style: { display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 } },
          weekDates.map((d,i) => {
            const k = toKey(d);
            const isSelected = k === selectedDay;
            const isTod = k === todayKey;
            const done = habits.filter(h=>isDone(h.id,k)).length;
            const full = done === habits.length && habits.length > 0;
            return React.createElement("div", { key:k,
              onClick: () => setSelectedDay(k),
              style: { display:"flex", flexDirection:"column", alignItems:"center", gap:4, cursor:"pointer", WebkitTapHighlightColor:"transparent" } },
              React.createElement("span", { style: { fontSize:11,
                color: isSelected ? ACCENT : isTod ? ACCENT : "#8e8e93",
                fontWeight: isSelected || isTod ? 600 : 400 } }, DAYS_SHORT[i]),
              React.createElement("div", { style: { width:34, height:34, borderRadius:10,
                background: isSelected ? ACCENT : full ? ACCENT_LIGHT : "#f2f2f7",
                border: isTod && !isSelected ? `2px solid ${ACCENT}` : "2px solid transparent",
                display:"flex", alignItems:"center", justifyContent:"center",
                transition:"all 0.15s" } },
                React.createElement("span", { style: { fontSize:12, fontWeight:600,
                  color: isSelected ? "#fff" : full ? ACCENT_DARK : isTod ? ACCENT : "#8e8e93" } }, d.getDate())
              ),
              done > 0 && !isSelected && React.createElement("div", { style: { width:4, height:4, borderRadius:2, background:ACCENT } })
            );
          })
        )
      ),

      // Habit list for selectedDay
      React.createElement("div", { style: { padding:"12px 16px 0" } },
        habits.map((h, hi) => {
          const color = COLORS[hi % COLORS.length];
          const s = streak(h.id);
          const done = isDone(h.id, selectedDay);
          return React.createElement("div", { key:h.id,
            style: { display:"flex", alignItems:"center", gap:14, padding:"14px 14px",
              background: done ? "#f0fdf8" : "#fff", borderRadius:18, marginBottom:8,
              border:`1px solid ${done ? ACCENT+"60" : "#e5e5ea"}`, transition:"all 0.15s",
              WebkitTapHighlightColor:"transparent" } },
            React.createElement("div", { onClick:()=>toggle(h.id, selectedDay), style:{ display:"flex", alignItems:"center", gap:14, flex:1, cursor:"pointer" } },
              React.createElement("div", { style: { width:44, height:44, borderRadius:13, background:color+"20", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 } },
                React.createElement("span", { style: { fontSize:22 } }, h.emoji)
              ),
              React.createElement("div", { style: { flex:1 } },
                React.createElement("div", { style: { fontSize:16, fontWeight:500, color:done?"#0F6E56":"#1c1c1e", textDecoration:done?"line-through":"none", opacity:done?0.75:1 } }, h.name),
                s > 0 && React.createElement("div", { style: { fontSize:12, color, marginTop:2 } }, `🔥 ${s} giorni consecutivi`)
              )
            ),
            React.createElement("div", { style: { display:"flex", flexDirection:"column", gap:6, alignItems:"center" } },
              React.createElement("div", { onClick:()=>toggle(h.id, selectedDay), style: { width:28, height:28, borderRadius:8,
                background:done?ACCENT:"transparent", border:`2px solid ${done?ACCENT:"#c7c7cc"}`,
                display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 } },
                done && React.createElement("span", { style: { color:"#fff", fontSize:15, lineHeight:1, fontWeight:700 } }, "✓")
              ),
              React.createElement("button", { onClick:()=>removeHabit(h.id),
                style: { background:"none", border:"none", cursor:"pointer", fontSize:14, color:"#c7c7cc", padding:0, lineHeight:1 } }, "✕")
            )
          );
        }),

        // Events on selectedDay
        events.filter(e => e.date === selectedDay).map(e => {
          const done = isDone(e.id, selectedDay);
          return React.createElement("div", { key:e.id, onClick:()=>toggle(e.id, selectedDay),
            style: { display:"flex", alignItems:"center", gap:14, padding:"14px 14px",
              background:"#fffbf0", borderRadius:18, marginBottom:8, cursor:"pointer",
              border:"1px solid #f5e6c0", WebkitTapHighlightColor:"transparent" } },
            React.createElement("div", { style: { width:44, height:44, borderRadius:13, background:"#FAEEDA", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 } },
              React.createElement("span", { style: { fontSize:22 } }, e.emoji)
            ),
            React.createElement("div", { style: { flex:1 } },
              React.createElement("div", { style: { fontSize:16, fontWeight:500, color:"#1c1c1e" } }, e.name),
              React.createElement("div", { style: { fontSize:12, color:"#BA7517", marginTop:2 } }, "📌 Attività extra")
            ),
            React.createElement("div", { style: { display:"flex", flexDirection:"column", gap:6, alignItems:"center" } },
              React.createElement("div", { style: { width:28, height:28, borderRadius:8,
                background:done?"#BA7517":"transparent", border:`2px solid ${done?"#BA7517":"#c7c7cc"}`,
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 } },
                done && React.createElement("span", { style: { color:"#fff", fontSize:15, fontWeight:700 } }, "✓")
              ),
              React.createElement("button", { onClick:ev=>{ev.stopPropagation();removeEvent(e.id);},
                style: { background:"none", border:"none", cursor:"pointer", fontSize:14, color:"#c7c7cc", padding:0 } }, "✕")
            )
          );
        }),

        // Add button / form
        !adding && React.createElement("button", { onClick:()=>setAdding(true),
          style: { width:"100%", padding:"15px", borderRadius:18, border:"1.5px dashed #c7c7cc",
            background:"none", cursor:"pointer", fontSize:15, color:"#8e8e93", marginTop:4,
            WebkitTapHighlightColor:"transparent" } },
          "+ Aggiungi abitudine o attività"
        ),

        adding && React.createElement("div", { style: { marginTop:8, padding:"16px", borderRadius:18, background:"#fff", border:"1px solid #e5e5ea" } },
          React.createElement("div", { style: { display:"flex", gap:6, marginBottom:14 } },
            ["daily","event"].map(t =>
              React.createElement("button", { key:t, onClick:()=>setNewType(t),
                style: { flex:1, padding:"10px", borderRadius:12, fontSize:14, cursor:"pointer", border:"none",
                  background:newType===t?ACCENT:"#f2f2f7", color:newType===t?"#fff":"#8e8e93", fontWeight:newType===t?600:400 } },
                t==="daily"?"Quotidiana":"Extra"
              )
            )
          ),
          React.createElement("div", { style: { display:"flex", gap:8, marginBottom:10, alignItems:"center" } },
            React.createElement("input", { value:newEmoji, onChange:e=>setNewEmoji(e.target.value),
              style: { width:50, textAlign:"center", borderRadius:12, border:"1px solid #e5e5ea", padding:"10px 6px", fontSize:20, background:"#f2f2f7" } }),
            React.createElement("input", { value:newName, onChange:e=>setNewName(e.target.value),
              placeholder:"Nome...", onKeyDown:e=>e.key==="Enter"&&addItem(),
              style: { flex:1, borderRadius:12, border:"1px solid #e5e5ea", padding:"10px 12px", fontSize:15, background:"#f2f2f7", color:"#1c1c1e" } })
          ),
          newType==="event" && React.createElement("input", { type:"date", value:newDate, onChange:e=>setNewDate(e.target.value),
            style: { width:"100%", marginBottom:10, borderRadius:12, border:"1px solid #e5e5ea", padding:"10px 12px", fontSize:15, background:"#f2f2f7", color:"#1c1c1e" } }),
          React.createElement("div", { style: { display:"flex", gap:8 } },
            React.createElement("button", { onClick:addItem,
              style: { flex:1, padding:"12px", borderRadius:12, border:"none", background:ACCENT, color:"#fff", fontSize:15, fontWeight:600, cursor:"pointer" } }, "Aggiungi"),
            React.createElement("button", { onClick:()=>setAdding(false),
              style: { flex:1, padding:"12px", borderRadius:12, border:"1px solid #e5e5ea", background:"none", fontSize:15, cursor:"pointer", color:"#8e8e93" } }, "Annulla")
          )
        )
      )
    ),

    // ── PAGE: REPORT ──
    page === "report" && React.createElement("div", { style: { flex:1, overflowY:"auto", paddingBottom:80, background:"#f2f2f7" } },
      React.createElement("div", { style: { background:"#fff", padding:"60px 20px 16px" } },
        React.createElement("div", { style: { fontSize:26, fontWeight:700, color:"#1c1c1e", marginBottom:16 } }, "Andamento"),
        React.createElement("div", { style: { display:"flex", background:"#f2f2f7", borderRadius:12, padding:3, marginBottom:14 } },
          ["week","month"].map(p =>
            React.createElement("button", { key:p, onClick:()=>{setReportPeriod(p);setReportOff(0);},
              style: { flex:1, padding:"9px", borderRadius:10, border:"none", cursor:"pointer", fontSize:14,
                background:reportPeriod===p?"#fff":"transparent",
                color:reportPeriod===p?"#1c1c1e":"#8e8e93", fontWeight:reportPeriod===p?600:400 } },
              p==="week"?"Settimanale":"Mensile"
            )
          )
        ),
        React.createElement("div", { style: { display:"flex", alignItems:"center", justifyContent:"space-between" } },
          React.createElement("button", { onClick:()=>setReportOff(o=>o-1), style: { background:"none", border:"none", cursor:"pointer", fontSize:20, color:"#8e8e93", padding:"4px 8px" } }, "‹"),
          React.createElement("span", { style: { fontSize:14, fontWeight:500, color:"#1c1c1e" } }, reportLabel()),
          React.createElement("button", { onClick:()=>setReportOff(o=>o+1), style: { background:"none", border:"none", cursor:"pointer", fontSize:20, color:"#8e8e93", padding:"4px 8px" } }, "›")
        )
      ),

      React.createElement("div", { style: { padding:"14px 16px 0" } },
        React.createElement("div", { style: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 } },
          [{ label:"Tasso globale", val:`${globalRate}%` }, { label:"Giorni tracciati", val:pastDates.length }].map(({label,val}) =>
            React.createElement("div", { key:label, style: { background:"#fff", borderRadius:18, padding:"16px" } },
              React.createElement("div", { style: { fontSize:12, color:"#8e8e93", marginBottom:4 } }, label),
              React.createElement("div", { style: { fontSize:28, fontWeight:700, color:"#1c1c1e" } }, val)
            )
          )
        ),

        reportPeriod==="month" && React.createElement("div", { style: { background:"#fff", borderRadius:18, padding:"16px", marginBottom:14 } },
          React.createElement("div", { style: { display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:6 } },
            DAYS_SHORT.map((d,i) => React.createElement("div", { key:i, style: { textAlign:"center", fontSize:10, color:"#8e8e93", paddingBottom:2 } }, d))
          ),
          React.createElement("div", { style: { display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 } },
            [...Array((reportDates[0].getDay()+6)%7)].map((_,i) => React.createElement("div", { key:"e"+i })),
            reportDates.map(d => {
              const k = toKey(d), isTod = k===todayKey, isPast = k<=todayKey;
              const done = habits.filter(h=>isDone(h.id,k)).length;
              const full = done===habits.length && habits.length>0;
              return React.createElement("div", { key:k, style: { aspectRatio:"1", borderRadius:6,
                background: !isPast?"#f2f2f7":full?ACCENT:done>0?ACCENT_LIGHT:"#f2f2f7",
                border: isTod?`2px solid ${ACCENT}`:"2px solid transparent",
                display:"flex", alignItems:"center", justifyContent:"center" } },
                React.createElement("span", { style: { fontSize:11, fontWeight:isTod?700:400,
                  color: !isPast?"#c7c7cc":full?"#fff":done>0?ACCENT_DARK:"#8e8e93" } }, d.getDate())
              );
            })
          )
        ),

        React.createElement("div", { style: { background:"#fff", borderRadius:18, overflow:"hidden", marginBottom:14 } },
          habits.map((h,hi) => {
            const color = COLORS[hi%COLORS.length];
            const rate = habitRate(h.id);
            const s = streak(h.id);
            return React.createElement("div", { key:h.id, style: { padding:"14px 16px", borderBottom:"0.5px solid #f2f2f7" } },
              React.createElement("div", { style: { display:"flex", alignItems:"center", gap:10, marginBottom:8 } },
                React.createElement("span", { style: { fontSize:20 } }, h.emoji),
                React.createElement("span", { style: { flex:1, fontSize:15, color:"#1c1c1e" } }, h.name),
                s > 0 && React.createElement("span", { style: { fontSize:12, color } }, `🔥${s}`),
                React.createElement("span", { style: { fontSize:15, fontWeight:600, color } }, `${rate}%`)
              ),
              React.createElement("div", { style: { height:5, borderRadius:3, background:"#f2f2f7" } },
                React.createElement("div", { style: { height:"100%", borderRadius:3, background:color, width:`${rate}%` } })
              )
            );
          })
        ),

        events.filter(e=>reportDates.some(d=>toKey(d)===e.date)).length > 0 &&
          React.createElement("div", { style: { background:"#fff", borderRadius:18, overflow:"hidden", marginBottom:14 } },
            React.createElement("div", { style: { padding:"12px 16px 8px", fontSize:12, fontWeight:600, color:"#8e8e93", borderBottom:"0.5px solid #f2f2f7" } }, "Attività extra"),
            events.filter(e=>reportDates.some(d=>toKey(d)===e.date)).map(e =>
              React.createElement("div", { key:e.id, style: { display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderBottom:"0.5px solid #f2f2f7" } },
                React.createElement("span", { style: { fontSize:18 } }, e.emoji),
                React.createElement("div", { style: { flex:1 } },
                  React.createElement("div", { style: { fontSize:14, color:"#1c1c1e" } }, e.name),
                  React.createElement("div", { style: { fontSize:11, color:"#8e8e93", marginTop:2 } }, e.date)
                ),
                React.createElement("div", { style: { fontSize:12, padding:"4px 10px", borderRadius:20,
                  background:isDone(e.id,e.date)?ACCENT_LIGHT:"#f2f2f7",
                  color:isDone(e.id,e.date)?ACCENT_DARK:"#8e8e93" } },
                  isDone(e.id,e.date)?"Fatto":"In attesa"
                )
              )
            )
          )
      )
    ),

    // ── BOTTOM TAB BAR ──
    React.createElement("div", { style: { position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
      width:"100%", maxWidth:430,
      background:"rgba(255,255,255,0.92)", backdropFilter:"blur(12px)",
      borderTop:"0.5px solid #e5e5ea", display:"flex", justifyContent:"space-around",
      padding:"10px 0 28px", zIndex:100 } },
      [{ id:"habits", label:"Abitudini", icon:"✓" }, { id:"report", label:"Andamento", icon:"◎" }].map(({id,label,icon}) =>
        React.createElement("button", { key:id, onClick:()=>setPage(id),
          style: { background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column",
            alignItems:"center", gap:3, padding:"4px 32px", WebkitTapHighlightColor:"transparent",
            color: page===id?ACCENT:"#8e8e93" } },
          React.createElement("span", { style: { fontSize:24 } }, icon),
          React.createElement("span", { style: { fontSize:11, fontWeight:page===id?600:400 } }, label)
        )
      )
    )
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
