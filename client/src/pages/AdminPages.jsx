import {useEffect,useState} from 'react';
import {api} from '../api/client.js';
import {Users,ShieldCheck,Plus,RefreshCw,UserX,UserCheck,Pencil,KeyRound,Link2} from 'lucide-react';
import {useAuth} from '../auth.jsx';

export function UsersPage(){
  const {user}=useAuth();
  const [items,setItems]=useState([]),[patients,setPatients]=useState([]),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(true),[form,setForm]=useState(false),[saving,setSaving]=useState(false);
  const [draft,setDraft]=useState({fullName:'',email:'',password:'',role:'STAFF'});
  const [patientId,setPatientId]=useState('');
  const [editor,setEditor]=useState(null);
  const [editDraft,setEditDraft]=useState({fullName:'',email:'',role:'CLIENT'});
  const isSuperadmin=user?.role==='SUPERADMIN';
  async function load(){
    setBusy(true);
    try{
      const d=await api('/auth/users?limit=100');setItems(d.items||[]);
      if(isSuperadmin){const p=await api('/lookups/patients');setPatients((p.items||[]).filter(x=>!x.userId&&x.email));}
      setError('');
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  useEffect(()=>{load();},[]);
  async function create(e){
    e.preventDefault();setSaving(true);setError('');setNotice('');
    try{await api('/auth/users',{method:'POST',body:draft});setForm(false);setDraft({fullName:'',email:'',password:'',role:'STAFF'});setNotice('User account created.');await load();}
    catch(e){setError(e.message);}finally{setSaving(false);}
  }
  async function enableClient(e){
    e.preventDefault();setSaving(true);setError('');setNotice('');
    try{
      const result=await api('/auth/users',{method:'POST',body:{action:'create_client_account',patientId}});
      setNotice(`Login enabled for ${result.patient.patientCode} · ${result.patient.fullName}. Temporary password: ${result.temporaryPassword}. The client must change it before viewing any health information.`);
      setPatientId('');await load();
    }catch(e){setError(e.message);}finally{setSaving(false);}
  }
  async function toggle(u){
    setError('');try{await api(`/auth/users/${u.id}/status`,{method:'PATCH',body:{isActive:!u.isActive}});setNotice(`Account ${u.isActive?'deactivated':'activated'}.`);await load();}
    catch(e){setError(e.message);}
  }
  function beginEdit(u){setEditor(u);setEditDraft({fullName:u.fullName,email:u.email,role:u.role});}
  async function saveEdit(e){
    e.preventDefault();if(!editor)return;setSaving(true);setError('');
    try{await api(`/auth/users/${editor.id}`,{method:'PATCH',body:editDraft});setNotice('User details updated. If this is a client account, the linked patient name and email were updated too.');setEditor(null);await load();}
    catch(e){setError(e.message);}finally{setSaving(false);}
  }
  async function resetPassword(u){
    if(!window.confirm(`Reset ${u.fullName}'s password to the temporary password 123456? They must change it before viewing any health information.`))return;
    setError('');setNotice('');
    try{const r=await api(`/auth/users/${u.id}/password`,{method:'POST',body:{}});setNotice(`Temporary password for ${u.email}: ${r.temporaryPassword}. Share it privately; the user must change it before accessing LIVYA.`);}
    catch(e){setError(e.message);}
  }
  return <div className="module-page">
    <div className="page-heading"><div><div className="eyebrow">ADMINISTRATION</div><h1><Users size={25}/>User access</h1><p>Manage sign-in, roles and access to the clinical workspace.</p></div><button className="primary-button" onClick={()=>setForm(!form)}><Plus size={17}/> Add user</button></div>
    {error&&<div className="notice error-notice">{error}</div>}{notice&&<div className="notice success-notice">{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss">×</button></div>}
    {isSuperadmin&&<section className="panel inline-form-panel"><div className="panel-heading"><div><h2><Link2 size={18}/> Enable client login</h2><p>Choose an existing patient. LIVYA links the login to that Patient ID, rather than creating a duplicate patient.</p></div></div>
      <form className="inline-user-form" onSubmit={enableClient}><label>Patient<select required value={patientId} onChange={e=>setPatientId(e.target.value)}><option value="">Select an unlinked patient with an email</option>{patients.map(p=><option key={p.id} value={p.id}>{p.patientCode} · {p.fullName} · {p.email}</option>)}</select></label><div className="field-help">Temporary password: 123456. The client must set a private password before any health information is shown.</div><div className="inline-form-actions"><button className="primary-button" disabled={saving||!patientId}>{saving?'Enabling…':'Enable client login'}</button></div></form>
    </section>}
    {form&&<section className="panel inline-form-panel"><div className="panel-heading"><div><h2>Create user</h2><p>Create a staff or partner account. For an existing patient, use Enable client login above so the account is linked correctly.</p></div></div><form className="inline-user-form" onSubmit={create}><label>Full name<input required maxLength={160} value={draft.fullName} onChange={e=>setDraft({...draft,fullName:e.target.value})}/></label><label>Email<input required type="email" value={draft.email} onChange={e=>setDraft({...draft,email:e.target.value})}/></label><label>Temporary password<input required type="password" minLength={8} maxLength={128} value={draft.password} onChange={e=>setDraft({...draft,password:e.target.value})}/><small className="field-help">Use at least 8 characters.</small></label><label>Role<select value={draft.role} onChange={e=>setDraft({...draft,role:e.target.value})}>{(isSuperadmin?['ADMIN','CLINICIAN','NUTRITIONIST','THERAPIST','STAFF','CLIENT','LAB_PARTNER']:['CLINICIAN','NUTRITIONIST','THERAPIST','STAFF','CLIENT','LAB_PARTNER']).map(r=><option key={r}>{r}</option>)}</select></label><div className="inline-form-actions"><button type="button" className="secondary-button" onClick={()=>setForm(false)}>Cancel</button><button className="primary-button" disabled={saving}>{saving?'Creating…':'Create user'}</button></div></form></section>}
    {editor&&<section className="panel inline-form-panel"><div className="panel-heading"><div><h2>Edit user</h2><p>Superadmin changes are audited. Client email/name changes also update the linked patient profile.</p></div></div><form className="inline-user-form" onSubmit={saveEdit}><label>Full name<input required maxLength={160} value={editDraft.fullName} onChange={e=>setEditDraft({...editDraft,fullName:e.target.value})}/></label><label>Email<input required type="email" value={editDraft.email} onChange={e=>setEditDraft({...editDraft,email:e.target.value})}/></label><label>Role<select value={editDraft.role} onChange={e=>setEditDraft({...editDraft,role:e.target.value})} disabled={!isSuperadmin}>{['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST','THERAPIST','STAFF','CLIENT','LAB_PARTNER'].map(r=><option key={r}>{r}</option>)}</select></label><div className="inline-form-actions"><button type="button" className="secondary-button" onClick={()=>setEditor(null)}>Cancel</button><button className="primary-button" disabled={saving}>{saving?'Saving…':'Save user'}</button></div></form></section>}
    <section className="panel table-panel"><div className="table-toolbar"><span className="record-count">{items.length} users</span><button className="icon-button" onClick={load} aria-label="Refresh users"><RefreshCw size={16}/></button></div><div className="table-scroll"><table><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Password</th><th>Created</th><th>Actions</th></tr></thead><tbody>{busy?<tr><td colSpan="7">Loading users…</td></tr>:items.map(u=><tr key={u.id}><td><b>{u.fullName}</b></td><td>{u.email}</td><td>{u.role}</td><td><span className={`status-pill ${u.isActive?'status-active':'status-cancelled'}`}>{u.isActive?'Active':'Inactive'}</span></td><td>{u.mustChangePassword?'Change required':'Set'}</td><td>{new Date(u.createdAt).toLocaleDateString()}</td><td><div className="row-actions">{isSuperadmin&&<><button className="secondary-button compact" onClick={()=>beginEdit(u)}><Pencil size={13}/> Edit</button><button className="secondary-button compact" onClick={()=>resetPassword(u)}><KeyRound size={13}/> Reset</button></> }<button className="secondary-button compact" disabled={u.id===user.id} onClick={()=>toggle(u)}>{u.isActive?<><UserX size={14}/> Deactivate</>:<><UserCheck size={14}/> Activate</>}</button></div></td></tr>)}</tbody></table></div></section>
  </div>;
}
export function AuditPage(){const [items,setItems]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(true);useEffect(()=>{api('/audit?limit=100').then(d=>setItems(d.items||[])).catch(e=>setError(e.message)).finally(()=>setBusy(false));},[]);return <div className="module-page"><div className="page-heading"><div><div className="eyebrow">ADMINISTRATION</div><h1><ShieldCheck size={25}/>Audit trail</h1><p>Review recorded changes to operational and clinical records.</p></div></div>{error&&<div className="notice error-notice">{error}</div>}<section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Resource</th><th>Record ID</th></tr></thead><tbody>{busy?<tr><td colSpan="5">Loading audit events…</td></tr>:items.map(a=><tr key={a.id}><td>{new Date(a.createdAt).toLocaleString()}</td><td>{a.actor?.fullName||'System'}</td><td><span className="status-pill status-active">{a.action}</span></td><td>{a.resource}</td><td><code>{a.resourceId||'—'}</code></td></tr>)}</tbody></table></div>{!busy&&!items.length&&<div className="empty-state"><ShieldCheck size={24}/><span>No audit events recorded yet.</span></div>}</section></div>}
