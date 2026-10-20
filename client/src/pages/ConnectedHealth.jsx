import { useState } from 'react';
import { Activity, Apple, ArrowDownRight, ArrowUpRight, BatteryCharging, CalendarDays, Check, ChevronDown, CircleHelp, Clock3, Droplets, Footprints, Heart, Moon, RefreshCw, ShieldCheck, Smartphone, Sparkles, Sun, Thermometer, Watch, Waves, Wind, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const demoMetrics = [
  { label: 'Steps', value: '8,426', unit: 'steps', goal: '10,000 daily goal', progress: 84, icon: Footprints, tone: 'blue', delta: '+12% vs last week' },
  { label: 'Active energy', value: '426', unit: 'kcal', goal: '500 kcal daily goal', progress: 85, icon: Zap, tone: 'amber', delta: '+8% vs last week' },
  { label: 'Heart rate', value: '72', unit: 'bpm', goal: 'Resting average', progress: null, icon: Heart, tone: 'red', delta: 'Resting: 64 bpm' },
  { label: 'Sleep', value: '7h 24m', unit: '', goal: '8h nightly goal', progress: 92, icon: Moon, tone: 'purple', delta: 'Efficiency: 89%' },
  { label: 'HRV', value: '48', unit: 'ms', goal: 'Heart-rate variability', progress: null, icon: Waves, tone: 'green', delta: 'Personal trend only' },
  { label: 'SpO₂', value: '97', unit: '%', goal: 'Blood oxygen estimate', progress: null, icon: Wind, tone: 'teal', delta: 'Last reading: 08:42' },
  { label: 'Distance', value: '6.2', unit: 'km', goal: 'Walking + running', progress: 78, icon: Activity, tone: 'blue', delta: '1.1 km above average' },
  { label: 'Workouts', value: '42', unit: 'min', goal: 'Today’s exercise', progress: 70, icon: CalendarDays, tone: 'amber', delta: '30 min daily goal' },
  { label: 'Respiratory rate', value: '15', unit: '/min', goal: 'During sleep', progress: null, icon: Wind, tone: 'green', delta: 'Trend view' },
  { label: 'Skin temperature', value: '+0.1', unit: '°C', goal: 'Change from baseline', progress: null, icon: Thermometer, tone: 'purple', delta: 'Device-dependent' },
  { label: 'Hydration', value: '1.8', unit: 'L', goal: 'Water logged manually', progress: 60, icon: Droplets, tone: 'teal', delta: '3.0 L personal target' },
  { label: 'Stand hours', value: '10', unit: 'hrs', goal: 'Hours with movement', progress: 83, icon: Sun, tone: 'amber', delta: '12 hour goal' },
];
const week = [
  { day: 'M', steps: 62, sleep: 70 }, { day: 'T', steps: 78, sleep: 82 }, { day: 'W', steps: 55, sleep: 66 },
  { day: 'T', steps: 88, sleep: 75 }, { day: 'F', steps: 72, sleep: 91 }, { day: 'S', steps: 96, sleep: 86 }, { day: 'S', steps: 84, sleep: 74 },
];
const insights = [
  { icon: Moon, title: 'Sleep routine', text: 'Your weekly sleep pattern can help you and your care team spot changes in recovery. Keep bedtime and wake time consistent.', tag: 'SLEEP' },
  { icon: Footprints, title: 'Movement goal', text: 'Use a comfortable daily movement target and build up gradually. Consistency matters more than a single high-step day.', tag: 'ACTIVITY' },
  { icon: Heart, title: 'Your personal baseline', text: 'Resting heart rate and HRV are most useful as trends against your own baseline, not as standalone diagnoses.', tag: 'RECOVERY' },
];

function MetricCard({ metric }) {
  const Icon = metric.icon;
  return <article className="health-metric-card">
    <div className="health-metric-top"><span className={`health-metric-icon ${metric.tone}`}><Icon size={18}/></span><span className="health-metric-dots">•••</span></div>
    <div className="health-metric-label">{metric.label}</div>
    <div className="health-metric-value">{metric.value}<small>{metric.unit}</small></div>
    <div className="health-metric-goal">{metric.goal}</div>
    {metric.progress !== null && <div className="health-progress"><span style={{ width: `${metric.progress}%` }}/></div>}
    <div className="health-metric-delta">{metric.delta}</div>
  </article>;
}

export default function ConnectedHealth() {
  const [period, setPeriod] = useState('7 days');
  const [tab, setTab] = useState('Overview');
  const [showAll, setShowAll] = useState(false);
  const [provider, setProvider] = useState('Apple Health');
  return <div className="connected-health-page">
    <div className="page-heading health-page-heading">
      <div><div className="eyebrow">CONNECTED HEALTH</div><h1><span className="health-title-icon"><Activity size={22}/></span> Your health, connected</h1><p>Fitness, sleep and recovery trends alongside your LIVYA care journey.</p></div>
      <Link to="/dashboard" className="secondary-button"><ArrowDownRight size={15}/> Back to dashboard</Link>
    </div>
    <section className="health-hero">
      <div className="health-hero-copy"><div className="health-live-label"><span/> PERSONAL HEALTH SPACE</div><h2>Small signals. Better habits.</h2><p>Bring your everyday movement and recovery into one place. When a supported health source is connected, this space will show your synced readings and longer-term trends.</p>
        <div className="health-hero-tags"><span><ShieldCheck size={14}/> Private to your account</span><span><Clock3 size={14}/> Last sync: not connected</span></div>
      </div>
      <div className="health-hero-art"><div className="health-orbit orbit-one"/><div className="health-orbit orbit-two"/><div className="health-watch-face"><Heart size={25}/><b>♥</b><span>HEALTH</span></div><span className="orbit-chip chip-heart"><Heart size={15}/></span><span className="orbit-chip chip-steps"><Footprints size={16}/></span><span className="orbit-chip chip-sleep"><Moon size={15}/></span></div>
    </section>
    <section className="health-provider-panel panel">
      <div className="health-provider-copy"><span className="health-panel-icon"><Watch size={19}/></span><div><h2>Connect a health source</h2><p>Choose the ecosystem you use on your phone or watch.</p></div></div>
      <div className="health-providers">
        <button className={`health-provider ${provider==='Apple Health'?'selected':''}`} onClick={()=>setProvider('Apple Health')}><span className="provider-mark apple"><Apple size={21}/></span><span><b>Apple Health</b><small>iPhone · Apple Watch</small></span>{provider==='Apple Health'&&<Check size={16}/>}</button>
        <button className={`health-provider ${provider==='Health Connect'?'selected':''}`} onClick={()=>setProvider('Health Connect')}><span className="provider-mark android"><Activity size={21}/></span><span><b>Health Connect</b><small>Android · supported apps</small></span>{provider==='Health Connect'&&<Check size={16}/>}</button>
      </div>
      <div className="health-provider-footer"><span><CircleHelp size={15}/> Connection setup is not active yet.</span><button className="primary-button" onClick={()=>document.getElementById('health-connect-note')?.scrollIntoView({behavior:'smooth',block:'center'})}>How it will work <ArrowUpRight size={14}/></button></div>
    </section>
    <div className="health-section-heading"><div><div className="eyebrow">YOUR METRICS</div><h2>Daily health snapshot</h2><p>Metrics supported by your device and the permissions you grant.</p></div><div className="health-period-tabs">{['Today','7 days','30 days'].map(p=><button key={p} className={period===p?'active':''} onClick={()=>setPeriod(p)}>{p}</button>)}</div></div>
    <div className="health-demo-banner"><Sparkles size={15}/><span><b>Design preview:</b> the numbers below are illustrative examples, not your readings. Live values will appear after secure health-source integration.</span></div>
    <div className="health-metric-grid">{demoMetrics.slice(0, showAll ? demoMetrics.length : 8).map(metric=><MetricCard key={metric.label} metric={metric}/>)}</div>
    <div className="health-show-more"><button className="secondary-button" onClick={()=>setShowAll(!showAll)}>{showAll?'Show fewer metrics':'Show all 12 metrics'} <ChevronDown size={15} style={{transform:showAll?'rotate(180deg)':'none'}}/></button></div>
    <div className="health-analysis-grid">
      <section className="panel health-trend-panel"><div className="panel-heading"><div><h2>Weekly activity trend</h2><p>Illustrative activity and sleep comparison</p></div><span className="health-chart-legend"><i className="legend-steps"/> Steps <i className="legend-sleep"/> Sleep</span></div>
        <div className="health-chart"><div className="health-chart-y"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0</span></div><div className="health-chart-plot"><div className="health-chart-gridlines"><i/><i/><i/><i/><i/></div><div className="health-bars">{week.map((d,i)=><div className="health-bar-day" key={i}><div className="health-bar-pair"><span className="health-bar steps" style={{height:`${d.steps}%`}}/><span className="health-bar sleep" style={{height:`${d.sleep}%`}}/></div><small>{d.day}</small></div>)}</div></div></div>
        <div className="health-chart-foot"><span><ArrowUpRight size={15}/> Trends will update as new readings sync</span><span>Example data only</span></div>
      </section>
      <section className="panel health-insights-panel"><div className="panel-heading"><div><h2>Lifestyle insights</h2><p>Gentle, non-diagnostic guidance</p></div><span className="health-spark"><Sparkles size={17}/></span></div><div className="health-insights-list">{insights.map((insight,i)=>{const Icon=insight.icon;return <article className="health-insight" key={insight.tag}><span className={`health-insight-icon insight-${i}`}><Icon size={17}/></span><div><span className="health-insight-tag">{insight.tag}</span><h3>{insight.title}</h3><p>{insight.text}</p></div></article>})}</div></section>
    </div>
    <section className="panel health-history-panel"><div className="panel-heading"><div><h2>Recent health readings</h2><p>Synced measurements will be listed here with their source and timestamp.</p></div><button className="secondary-button compact" onClick={()=>setTab(tab==='Overview'?'History':'Overview')}><RefreshCw size={14}/> {tab==='Overview'?'View history':'Back to overview'}</button></div>
      {tab==='History' ? <div className="health-empty-history"><Clock3 size={24}/><b>No connected readings yet</b><span>Once a health source is connected, your recent measurements and timestamps will appear here.</span></div> : <div className="health-history-empty"><div className="health-history-empty-icon"><Smartphone size={22}/></div><div><b>Your readings will show up here</b><span>Each entry will include metric, value, unit, source device and recorded time.</span></div><span className="health-not-connected-pill">Not connected</span></div>}
    </section>
    <section id="health-connect-note" className="health-privacy-note"><span><ShieldCheck size={19}/></span><div><b>Your data stays under your control</b><p>Health data access will require your explicit permission. You will be able to disconnect a source and revoke access. Only approved metrics needed for the LIVYA experience should be synced; this preview does not read or store health data.</p></div></section>
    <div className="dashboard-note"><Clock3 size={16}/><span>Wearable readings are estimates and may vary by device. Lifestyle insights are educational and do not diagnose, treat or replace advice from your care team.</span></div>
  </div>;
}
