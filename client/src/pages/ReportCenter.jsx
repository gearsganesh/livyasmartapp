import {useCallback,useEffect,useMemo,useState} from 'react';
import {FileText,FileUp,Eye,RefreshCw,ShieldCheck,Clock3,AlertCircle,CheckCircle2,Activity} from 'lucide-react';
import {supabase} from '../api/supabase.js';
import {useAuth} from '../auth.jsx';

const MAX_FILE_BYTES=20*1024*1024;
const rolesAllowedToUpload=['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST','STAFF'];
const dateToday=()=>new Date().toISOString().slice(0,10);
const prettyDate=value=>value?new Date(value+'T00:00:00').toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):'Date not set';
const prettySize=value=>value<1024*1024?(value/1024).toFixed(0)+' KB':(value/1024/1024).toFixed(1)+' MB';

export default function ReportCenter(){
  const {user}=useAuth();
  const canUpload=rolesAllowedToUpload.includes(user?.role);
  const [patients,setPatients]=useState([]);
  const [reports,setReports]=useState([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [patientId,setPatientId]=useState('');
  const [reportType,setReportType]=useState('Laboratory');
  const [title,setTitle]=useState('');
  const [reportDate,setReportDate]=useState(dateToday());
  const [file,setFile]=useState(null);
  const [filterPatient,setFilterPatient]=useState('');
  const [openingId,setOpeningId]=useState('');

  const patientById=useMemo(()=>new Map(patients.map(p=>[p.id,p])),[patients]);

  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const {data:authData}=await supabase.auth.getUser();
      if(!authData?.user)throw new Error('Please sign in again.');
      const {data:patientRows,error:patientError}=await supabase.from('Patient').select('id,patientCode,fullName,email,userId').order('patientCode',{ascending:true});
      if(patientError)throw patientError;
      setPatients(patientRows||[]);
      const {data:reportRows,error:reportError}=await supabase.from('PatientReport').select('*').order('reportDate',{ascending:false}).order('createdAt',{ascending:false});
      if(reportError)throw reportError;
      setReports(reportRows||[]);
      if(user?.role==='CLIENT'){
        const own=(patientRows||[]).find(p=>p.userId===authData.user.id);
        setPatientId(own?.id||'');setFilterPatient(own?.id||'');
      }
    }catch(e){setError(e.message||'Unable to load reports.');}
    finally{setLoading(false);}
  },[user?.role]);
  useEffect(()=>{load();},[load]);

  async function upload(e){
    e.preventDefault();setError('');setNotice('');
    if(!canUpload)return setError('Only authorized care staff can upload reports.');
    if(!patientId)return setError('Select a patient first.');
    if(!file)return setError('Choose a PDF report to upload.');
    if(file.type!=='application/pdf'&&!file.name.toLowerCase().endsWith('.pdf'))return setError('Only PDF files are accepted.');
    if(file.size<=0||file.size>MAX_FILE_BYTES)return setError('PDF must be smaller than 20 MB.');
    if(!reportDate)return setError('Enter the report date shown on the document.');
    setSaving(true);
    let storagePath='';
    try{
      const safeName=file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g,'_').slice(-150)||'report.pdf';
      storagePath=patientId+'/'+crypto.randomUUID()+'-'+safeName;
      const {error:uploadError}=await supabase.storage.from('patient-reports').upload(storagePath,file,{contentType:'application/pdf',upsert:false});
      if(uploadError)throw uploadError;
      const {data:authData}=await supabase.auth.getUser();
      const {error:insertError}=await supabase.from('PatientReport').insert({
        patientId,reportType,title:title.trim()||file.name.replace(/\.pdf$/i,'').slice(0,180),
        reportDate,originalFileName:file.name,storagePath,mimeType:'application/pdf',fileSize:file.size,
        extractionStatus:'NOT_STARTED',reviewStatus:'PENDING',uploadedBy:authData.user.id
      });
      if(insertError){
        await supabase.storage.from('patient-reports').remove([storagePath]);
        throw insertError;
      }
      setNotice('Report uploaded securely and linked to the selected patient. Automatic PDF extraction is not enabled yet; the report is stored safely but its results have not been analysed.');
      setTitle('');setFile(null);setReportType('Laboratory');setReportDate(dateToday());
      const input=document.getElementById('patient-report-pdf');if(input)input.value='';
      await load();
    }catch(e){setError(e.message||'Report upload failed.');}
    finally{setSaving(false);}
  }

  async function openReport(report){
    setOpeningId(report.id);setError('');
    try{
      const {data,error:signError}=await supabase.storage.from('patient-reports').createSignedUrl(report.storagePath,60);
      if(signError)throw signError;
      window.open(data.signedUrl,'_blank','noopener,noreferrer');
    }catch(e){setError(e.message||'Unable to open this report.');}
    finally{setOpeningId('');}
  }

  const visibleReports=reports.filter(r=>!filterPatient||r.patientId===filterPatient);
  const selectedPatient=patients.find(p=>p.id===patientId);
  return <div className="module-page report-center">
    <div className="page-heading"><div><div className="eyebrow">CLINICAL WORKSPACE</div><h1><FileText size={25}/> Reports &amp; health trends</h1><p>Store patient reports securely now; structured extraction and longitudinal analysis will be enabled in the next stage.</p></div><button className="secondary-button" onClick={load}><RefreshCw size={16}/> Refresh</button></div>
    {error&&<div className="notice error-notice"><AlertCircle size={17}/>{error}</div>}
    {notice&&<div className="notice success-notice"><CheckCircle2 size={17}/><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="Dismiss">×</button></div>}
    {canUpload&&<section className="panel report-upload-panel">
      <div className="panel-heading"><div><h2><FileUp size={19}/> Upload patient report</h2><p>Select the existing patient. The PDF will be saved privately and linked to their Patient ID.</p></div><ShieldCheck size={23} color="#16845b"/></div>
      <form className="report-upload-form" onSubmit={upload}>
        <label>Patient<select required value={patientId} onChange={e=>setPatientId(e.target.value)}><option value="">Select patient</option>{patients.map(p=><option key={p.id} value={p.id}>{p.patientCode||'ID pending'} · {p.fullName}{p.email?' · '+p.email:''}</option>)}</select></label>
        {selectedPatient&&<div className="report-patient-chip"><ShieldCheck size={16}/><span>Linked patient: <b>{selectedPatient.patientCode||'Patient ID pending'} · {selectedPatient.fullName}</b></span></div>}
        <div className="report-form-grid">
          <label>Report category<select value={reportType} onChange={e=>setReportType(e.target.value)}><option>Laboratory</option><option>Blood test</option><option>Urine test</option><option>Imaging</option><option>Discharge summary</option><option>Other</option></select></label>
          <label>Report date<input type="date" required value={reportDate} onChange={e=>setReportDate(e.target.value)}/></label>
          <label className="report-title-field">Report title (optional)<input maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Complete blood count"/></label>
          <label className="report-file-field">PDF file<input id="patient-report-pdf" type="file" accept="application/pdf,.pdf" required onChange={e=>setFile(e.target.files?.[0]||null)}/><small>PDF only · maximum 20 MB{file?' · '+prettySize(file.size):''}</small></label>
        </div>
        <div className="report-upload-footer"><span><ShieldCheck size={15}/> Private storage. Access follows the patient's account permissions.</span><button className="primary-button" disabled={saving}>{saving?'Uploading…':<><FileUp size={16}/> Upload report</>}</button></div>
      </form>
    </section>}
    {!canUpload&&<section className="panel report-client-note"><Activity size={22}/><div><h2>Your reports</h2><p>Reports uploaded by your care team will appear here. Results and progress graphs will appear once extraction and review are enabled.</p></div></section>}
    <section className="panel table-panel report-list-panel">
      <div className="table-toolbar"><div><b>Patient reports</b><div className="field-help">{visibleReports.length} report{visibleReports.length===1?'':'s'} · sorted by report date</div></div><div className="report-list-tools">{user?.role!=='CLIENT'&&<select aria-label="Filter by patient" value={filterPatient} onChange={e=>setFilterPatient(e.target.value)}><option value="">All patients</option>{patients.map(p=><option key={p.id} value={p.id}>{p.patientCode||'ID pending'} · {p.fullName}</option>)}</select>}<button className="icon-button" onClick={load} aria-label="Refresh reports"><RefreshCw size={16}/></button></div></div>
      <div className="table-scroll"><table><thead><tr>{user?.role!=='CLIENT'&&<th>Patient</th>}<th>Report</th><th>Report date</th><th>Analysis status</th><th>Review</th><th>File</th></tr></thead><tbody>
        {loading?<tr><td colSpan={user?.role==='CLIENT'?5:6}>Loading reports…</td></tr>:visibleReports.length===0?<tr><td colSpan={user?.role==='CLIENT'?5:6} className="report-empty"><FileText size={22}/><b>No reports uploaded yet</b><span>Upload a PDF above to begin building this patient's report history.</span></td></tr>:visibleReports.map(r=><tr key={r.id}>
          {user?.role!=='CLIENT'&&<td><b>{patientById.get(r.patientId)?.patientCode||'Patient'}</b><div className="field-help">{patientById.get(r.patientId)?.fullName||r.patientId}</div></td>}
          <td><b>{r.title}</b><div className="field-help">{r.reportType} · {r.originalFileName}</div></td><td>{prettyDate(r.reportDate)}</td>
          <td><span className={`status-pill ${r.extractionStatus==='COMPLETED'?'status-active':'status-pending'}`}>{r.extractionStatus==='NOT_STARTED'?'Not analysed':r.extractionStatus.replaceAll('_',' ')}</span></td>
          <td><span className={`status-pill ${r.reviewStatus==='APPROVED'?'status-active':'status-pending'}`}>{r.reviewStatus.replaceAll('_',' ')}</span></td>
          <td><button className="secondary-button compact" onClick={()=>openReport(r)} disabled={openingId===r.id}><Eye size={14}/>{openingId===r.id?'Opening…':'View PDF'}</button></td>
        </tr>)}
      </tbody></table></div>
      <div className="report-footnote"><Clock3 size={15}/> Upload date and clinical report date are kept separately. Opening a PDF uses a short-lived private link.</div>
    </section>
  </div>;
}
