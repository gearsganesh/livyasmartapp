import {useCallback,useEffect,useMemo,useState} from 'react';import {useParams} from 'react-router-dom';import * as Icons from 'lucide-react';import {api} from '../api/client.js';import {modules,moduleByKey} from '../config.js';import {useAuth} from '../auth.jsx';
const human=v=>String(v??'—').replaceAll('_',' ');
const relationshipLookups={patientId:['patients','patient'],clinicianId:['users','lookup:users'],prescribedBy:['users','lookup:users'],assessedBy:['users','lookup:users'],programId:['programs','lookup:programs'],planAssignmentId:['plans','lookup:plans'],prescriptionId:['prescriptions','lookup:prescriptions'],medicineId:['medicines','lookup:medicines'],therapistId:['therapists','lookup:therapists'],therapyId:['therapies','lookup:therapies'],orderId:['orders','lookup:orders'],productId:['products','lookup:products'],labPartnerId:['labs','lookup:labs'],recipientId:['users','lookup:users'],recordId:['records','lookup:records']};
function relatedLabel(field,id,lookups){const config=relationshipLookups[field];if(!config||!id)return '—';const option=(lookups[config[0]]||[]).find(row=>row.id===id);return option?lookupLabel(config[1],option):'Linked record unavailable';}
const niceDate=v=>{if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString(undefined,{year:'numeric',month:'short',day:'2-digit',hour:d.getHours()||d.getMinutes()? '2-digit':undefined,minute:d.getHours()||d.getMinutes()?'2-digit':undefined});};
function display(v){if(v===null||v===undefined||v==='')return '—';if(typeof v==='object')return JSON.stringify(v);return String(v).replaceAll('_',' ');}
function lookupLabel(type, option) {
  if (type === 'patient') return `${option.patientCode || 'Patient ID pending'} · ${option.fullName}`;
  if (type === 'lookup:users' || type === 'lookup:recipients') return `${option.fullName} · ${option.role}`;
  if (type === 'lookup:programs') return `${option.name} · ${option.category}`;
  if (type === 'lookup:plans') return `Plan · ${option.status} · ${option.startDate ? new Date(option.startDate).toLocaleDateString() : option.id.slice(0, 8)}`;
  if (type === 'lookup:prescriptions') return `Prescription · ${option.status} · ${option.issuedAt ? new Date(option.issuedAt).toLocaleDateString() : option.id.slice(0, 8)}`;
  if (type === 'lookup:medicines') return `${option.name}${option.strength ? ` · ${option.strength}` : ''}`;
  if (type === 'lookup:therapists') return option.fullName;
  if (type === 'lookup:therapies') return `${option.name} · ${option.category}`;
  if (type === 'lookup:products') return `${option.name}${option.sku ? ` · ${option.sku}` : ''}`;
  if (type === 'lookup:orders') return `${option.orderNumber} · ${option.status}`;
  if (type === 'lookup:orderItems') return `${option.productName} · Qty ${option.quantity}`;
  if (type === 'lookup:labs') return option.name;
  if (type === 'lookup:records') return `${option.title} · ${option.status}`;
  return option.name || option.title || option.id;
}

function RecordForm({ module, item, lookups, lookupErrors, lookupsLoading, onClose, onSaved, userRoleForForm }) {
  const [values, setValues] = useState(() => {
    const initial = {};
    for (const [key, , type] of module.fields) {
      let value = item?.[key];
      if (type === 'datetime-local' && value) value = new Date(value).toISOString().slice(0, 16);
      else if (type === 'date' && value) value = new Date(value).toISOString().slice(0, 10);
      else if (['specializations', 'services'].includes(key) && Array.isArray(value)) value = value.join(', ');
      else if (['content', 'assessment', 'recommendations', 'output', 'metadata', 'goals', 'shippingAddress'].includes(key) && value && typeof value === 'object') value = JSON.stringify(value, null, 2);
      initial[key] = value ?? (type === 'checkbox' ? false : '');
    }
    return initial;
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  function change(key, value) {
    setValues(current => ({ ...current, [key]: value }));
  }
  async function submit(event) {
    event.preventDefault();
    setError('');
    const body = {};
    try {
      for (const [key, , type] of module.fields) {
        if (type === 'generated') continue;
        const value = values[key];
        if (value === '' || value === null || value === undefined) {
          if (item) body[key] = ['specializations', 'services'].includes(key) ? [] : null;
          continue;
        }
        if (type === 'checkbox') { body[key] = Boolean(value); continue; }
        if (type === 'number') {
          body[key] = Number(value);
          if (!Number.isFinite(body[key])) throw new Error(`${key} must be numeric.`);
          continue;
        }
        if (['date', 'datetime-local'].includes(type)) { body[key] = new Date(value).toISOString(); continue; }
        if (['specializations', 'services'].includes(key)) {
          body[key] = String(value).split(',').map(part => part.trim()).filter(Boolean);
          continue;
        }
        if (['content', 'assessment', 'recommendations', 'output', 'metadata', 'shippingAddress'].includes(key) || (key === 'goals' && module.key === 'plans')) {
          body[key] = typeof value === 'string' ? JSON.parse(value) : value;
          continue;
        }
        body[key] = value;
      }
      setBusy(true);
      const result = item
        ? await api(`/${module.key}/${item.id}`, { method: 'PATCH', body })
        : await api(`/${module.key}`, { method: 'POST', body });
      onSaved(result?.item);
    } catch (err) {
      setError(err.message === 'Unexpected end of JSON input' ? 'Enter valid JSON in the JSON fields.' : err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="record-modal" role="dialog" aria-modal="true" aria-labelledby="record-title">
        <header className="modal-heading">
          <div><span className="eyebrow">{item ? 'UPDATE RECORD' : 'NEW RECORD'}</span><h2 id="record-title">{item ? 'Edit' : 'Create'} {module.label.toLowerCase().replace(/s$/, '')}</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close"><Icons.X size={19}/></button>
        </header>
        <form onSubmit={submit}>
          <div className="modal-fields">
            {module.fields.filter(field => !(field[2] === 'generated' && !item?.id)).map(field => {
              const [key, label, type] = field;
              const required = typeof field[3] === 'boolean' ? field[3] : Boolean(field[4]);
              if (userRoleForForm === 'CLIENT' && module.key === 'appointments' && !['title','appointmentType','startAt','notes'].includes(key)) return null;
              const lookupKey = type === 'patient' ? 'patients' : (typeof type === 'string' && type.startsWith('lookup:') ? type.slice(7) : null);
              const options = lookupKey ? (lookups[lookupKey] || []) : [];
              return (
                <label key={key} className={type === 'textarea' ? 'field-wide' : ''}>
                  {label}
                  {type === 'generated' ? (
                    <input type="text" value={values[key] ?? ''} readOnly aria-readonly="true" placeholder="Assigned automatically by LIVYA"/>
                  ) : type === 'select' ? (
                    <select required={required} value={values[key] ?? ''} onChange={event => change(key, event.target.value)}>
                      <option value="">Select {label.toLowerCase()}</option>
                      {((Array.isArray(field[3]) ? field[3] : field[4]) || []).map(option => <option key={option} value={option}>{human(option)}</option>)}
                    </select>
                  ) : lookupKey ? (
                    <>
                      <select required={required} value={values[key] ?? ''} onChange={event => change(key, event.target.value)} disabled={lookupsLoading}>
                        <option value="">{lookupsLoading ? 'Loading options…' : lookupErrors[lookupKey] ? 'Could not load options' : options.length ? `Select ${label.toLowerCase()}` : `No ${label.toLowerCase()} options available`}</option>
                        {options.map(option => <option key={option.id} value={option.id}>{lookupLabel(type, option)}</option>)}
                      </select>
                      {(lookupErrors[lookupKey] || (!lookupsLoading && !options.length)) && (
                        <small className="field-help">{lookupErrors[lookupKey] || (type === 'patient' ? 'No patients are available to this account. Create a patient or check access.' : 'Create the required record first.')}</small>
                      )}
                    </>
                  ) : type === 'textarea' ? (
                    <textarea required={required} rows={3} value={values[key] ?? ''} onChange={event => change(key, event.target.value)} placeholder={key === 'content' ? 'Enter valid JSON, e.g. {"summary":"..."}' : `Enter ${label.toLowerCase()}`}/>
                  ) : type === 'checkbox' ? (
                    <span className="checkbox-field"><input type="checkbox" checked={Boolean(values[key])} onChange={event => change(key, event.target.checked)}/><span>Enabled</span></span>
                  ) : (
                    <input required={required} type={type || 'text'} step={type === 'number' ? 'any' : undefined} value={values[key] ?? ''} onChange={event => change(key, event.target.value)} placeholder={`Enter ${label.toLowerCase()}`}/>
                  )}
                </label>
              );
            })}
          </div>
          {error && <div role="alert" className="form-error modal-error">{error}</div>}
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? 'Saving…' : item ? 'Save changes' : 'Create record'}</button></div>
        </form>
      </section>
    </div>
  );
}
export default function ModulePage(){const {moduleKey}=useParams();const module=moduleByKey[moduleKey];const {user}=useAuth();const [items,setItems]=useState([]),[lookups,setLookups]=useState({}),[lookupErrors,setLookupErrors]=useState({}),[lookupsLoading,setLookupsLoading]=useState(false),[q,setQ]=useState(''),[page,setPage]=useState(1),[total,setTotal]=useState(0),[busy,setBusy]=useState(true),[error,setError]=useState(''),[editor,setEditor]=useState(null),[deleting,setDeleting]=useState(null),[toast,setToast]=useState('');const [status,setStatus]=useState('');const pageSize=15;const adminOnlyModules=['patients','programs','therapists','labs','products','sops'];const canCreate=['SUPERADMIN','ADMIN'].includes(user?.role)||(['CLINICIAN','NUTRITIONIST','THERAPIST','STAFF'].includes(user?.role)&&!adminOnlyModules.includes(moduleKey))||(user?.role==='CLIENT'&&moduleKey==='appointments');const canEdit=canCreate;const canDelete=['SUPERADMIN','ADMIN'].includes(user?.role);const Icon=Icons[module?.icon]||Icons.FolderKanban;
const load=useCallback(async()=>{if(!module)return;setBusy(true);setError('');try{const params=new URLSearchParams({page:String(page),limit:String(pageSize),q});if(status)params.set('status',status);const data=await api(`/${module.key}?${params}`);setItems(data.items||[]);setTotal(data.total||0);}catch(e){setError(e.message);}finally{setBusy(false);}},[module,page,q,status]);useEffect(()=>{load();},[load]);const refreshLookups=useCallback(async()=>{if(!module)return;const needed=[...new Set(module.fields.map(([, ,type])=>type==='patient'?'patients':typeof type==='string'&&type.startsWith('lookup:')?type.slice(7):null).filter(Boolean))];if(!needed.length)return;setLookupsLoading(true);const errors={};const results=await Promise.all(needed.map(async key=>{try{return [key,await api(`/lookups/${key}`)]}catch(e){errors[key]=e.message;return [key,null]}}));setLookups(prev=>{const next={...prev};for(const [key,result] of results)if(result)next[key]=result.items||[];return next;});setLookupErrors(errors);setLookupsLoading(false);},[module]);useEffect(()=>{refreshLookups();},[refreshLookups]);useEffect(()=>{setPage(1);setQ('');setStatus('');},[moduleKey]);const cols=useMemo(()=>{if(!module)return[];const priority=['fullName','patientCode','appointmentNumber','invoiceNumber','orderNumber','bookingNumber','title','name','testName','metric','severity','status','startAt','appointmentType','category','phone','email','createdAt'];const available=module.fields.map(f=>f[0]);return [...priority.filter(k=>available.includes(k)),...available.filter(k=>!priority.includes(k))].slice(0,5);},[module]);if(!module){return <div className="notice error-notice">Unknown module.</div>;}async function remove(item){if(!window.confirm(`Delete this ${module.label.toLowerCase()} record? This cannot always be undone.`))return;setDeleting(item.id);try{await api(`/${module.key}/${item.id}`,{method:'DELETE'});setToast('Record deleted.');await load();}catch(e){setError(e.message);}finally{setDeleting(null);}}
return <div className="module-page"><div className="page-heading"><div><div className="eyebrow">{module.group.toUpperCase()}</div><h1><Icon size={25}/>{module.label}</h1><p>{module.description}. {user?.role==='CLIENT'&&moduleKey==='appointments'?'Request a time; LIVYA staff will confirm or suggest a change.':'Manage records and keep the workflow current.'}</p></div>{canCreate&&<button className="primary-button" onClick={()=>{setEditor({});refreshLookups();}}><Icons.Plus size={17}/> {user?.role==='CLIENT'&&moduleKey==='appointments'?'Request appointment':`Add ${module.label.replace(/s$/,'')}`}</button>}</div>{toast&&<div className="notice success-notice"><Icons.CheckCircle2 size={17}/>{toast}<button onClick={()=>setToast('')} aria-label="Dismiss"><Icons.X size={15}/></button></div>}{error&&<div className="notice error-notice"><Icons.AlertCircle size={17}/>{error}<button onClick={()=>setError('')} aria-label="Dismiss"><Icons.X size={15}/></button></div>}<section className="panel table-panel"><div className="table-toolbar"><div className="search-field"><Icons.Search size={17}/><input value={q} onChange={e=>{setQ(e.target.value);setPage(1);}} placeholder={`Search ${module.label.toLowerCase()}…`} aria-label={`Search ${module.label}`}/>{q&&<button onClick={()=>setQ('')} aria-label="Clear search"><Icons.X size={15}/></button>}</div><div className="toolbar-right"><span className="record-count">{total.toLocaleString()} records</span>{module.fields.some(f=>f[0]==='status')&&<select aria-label="Filter by status" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="">All statuses</option>{[...new Set(module.fields.find(f=>f[0]==='status')?.[3]||[])].map(s=><option value={s} key={s}>{human(s)}</option>)}</select>}<button className="icon-button" onClick={load} aria-label="Refresh records"><Icons.RefreshCw size={16}/></button></div></div><div className="table-scroll"><table><thead><tr>{cols.map(k=><th key={k}>{k.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase())}</th>)}<th className="actions-col">Actions</th></tr></thead><tbody>{busy?Array.from({length:6},(_,i)=><tr key={i}>{cols.map(k=><td key={k}><div className="table-skeleton"/></td>)}<td><div className="table-skeleton action-skeleton"/></td></tr>):items.length?items.map(item=><tr key={item.id}>{cols.map(k=><td key={k} >{relationshipLookups[k]?<span title={item[k]}>{relatedLabel(k,item[k],lookups)}</span>:k==='status'||k==='severity'?<span className={`status-pill status-${String(item[k]||'').toLowerCase()}`}>{human(item[k])}</span>:k==='startAt'||k==='endAt'||k==='createdAt'||k==='issuedAt'||k==='scheduledAt'||k==='assessmentDate'||k==='dateOfBirth'?niceDate(item[k]):<span className={k==='fullName'||k==='title'||k==='name'?'primary-cell':''} title={display(item[k])}>{display(item[k])}</span>}</td>)}<td><div className="row-actions">{moduleKey==='appointments'&&['ADMIN','SUPERADMIN','CLINICIAN','NUTRITIONIST','THERAPIST','STAFF'].includes(user?.role)&&item.status==='REQUESTED'&&<><button className="secondary-button compact" onClick={async()=>{try{await api(`/appointments/${item.id}`,{method:'PATCH',body:{status:'CONFIRMED'}});setToast('Appointment approved and confirmed.');await load();}catch(e){setError(e.message);}}}>Approve</button><button className="secondary-button compact" onClick={async()=>{try{await api(`/appointments/${item.id}`,{method:'PATCH',body:{status:'CANCELLED'}});setToast('Appointment request declined.');await load();}catch(e){setError(e.message);}}}>Decline</button></>}{canEdit&&<button className="icon-button small" title="Edit record" aria-label="Edit record" onClick={()=>{setEditor(item);refreshLookups();}}><Icons.Pencil size={15}/></button>}{canDelete&&<button className="icon-button small danger-icon" title="Delete record" aria-label="Delete record" disabled={deleting===item.id} onClick={()=>remove(item)}><Icons.Trash2 size={15}/></button>}</div></td></tr>):<tr><td colSpan={cols.length+1}><div className="empty-state table-empty"><Icons.FolderOpen size={26}/><b>No records found</b><span>{q?'Try another search term.':'Records created for this module will appear here.'}</span>{canCreate&&<button className="text-link" onClick={()=>setEditor({})}>Create the first record <Icons.ArrowUpRight size={14}/></button>}</div></td></tr>}</tbody></table></div><div className="table-footer"><span>Showing {items.length?((page-1)*pageSize)+1:0}–{Math.min(page*pageSize,total)} of {total}</span><div className="pagination"><button className="secondary-button compact" disabled={page<=1||busy} onClick={()=>setPage(p=>p-1)}><Icons.ChevronLeft size={15}/> Previous</button><span>Page {page} of {Math.max(1,Math.ceil(total/pageSize))}</span><button className="secondary-button compact" disabled={page>=Math.ceil(total/pageSize)||busy} onClick={()=>setPage(p=>p+1)}>Next <Icons.ChevronRight size={15}/></button></div></div></section>{editor&&<RecordForm module={module} item={editor.id?editor:null} lookups={lookups} lookupErrors={lookupErrors} lookupsLoading={lookupsLoading} userRoleForForm={user?.role} onClose={()=>setEditor(null)} onSaved={async(saved)=>{setEditor(null);setToast(moduleKey==='patients'&&saved?.patientCode?`Patient created: ${saved.patientCode}`:moduleKey==='appointments'&&user?.role==='CLIENT'?'Appointment request sent. It will show as approved once staff confirms it.':'Changes saved successfully.');await load();}}/>}</div>}
