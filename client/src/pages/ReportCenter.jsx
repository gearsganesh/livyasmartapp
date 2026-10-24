import {useCallback,useEffect,useState} from 'react';
import * as Icons from 'lucide-react';
import {supabase} from '../api/supabase.js';
import {useAuth} from '../auth.jsx';

const STAFF=['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST','THERAPIST','STAFF'];
const MAX_BYTES=20*1024*1024;
const dateLabel=value=>value?new Date(value+'T00:00:00').toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):'—';

export default function ReportCenter(){
  const {user}=useAuth();
  const isStaff=STAFF.includes(user?.role);
  const [patients,setPatients]=useState([]);
  const [patientId,setPatientId]=useState('');
  const [reports,setReports]=useState([]);
  const [file,setFile]=useState(null);
  const [title,setTitle]=useState('');
  const [reportType,setReportType]=useState('LAB');
  const [reportDate,setReportDate]=useState(new Date().toISOString().slice(0,10));
  const [loading,setLoading]=useState(true);
  const [uploading,setUploading]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      let activePatientId=patientId;
      if(!isStaff){
        const {data:patient,error:patientError}=await supabase.from('Patient').select('id').eq('userId',user.id).maybeSingle();
        if(patientError)throw patientError;
        if(!patient){setPatients([]);setReports([]);setError('Your account is not linked to a patient profile yet. Please contact LIVYA staff.');return;}
        activePatientId=patient.id;setPatientId(patient.id);
      }else{
        const {data:rows,error:patientError}=await supabase.from('Patient').select('id,patientCode,fullName').order('fullName');
        if(patientError)throw patientError;
        setPatients(rows||[]);
        if(!activePatientId&&rows?.length){activePatientId=rows[0].id;setPatientId(rows[0].id);}
      }
      if(!activePatientId){setReports([]);return;}
      let query=supabase.from('PatientReport').select('id,patientId,reportType,title,reportDate,originalFileName,mimeType,fileSize,extractionStatus,reviewStatus,createdAt,uploadedBy').eq('patientId',activePatientId).order('reportDate',{ascending:false});
      const {data:rows,error:reportError}=await query;
      if(reportError)throw reportError;
      setReports(rows||[]);
    }catch(e){setError(e.message||'Unable to load reports.');}
    finally{setLoading(false);}
  },[isStaff,patientId,user?.id]);

  useEffect(()=>{load();},[load]);

  async function upload(e){
    e.preventDefault();setError('');setNotice('');
    if(!file){setError('Choose a PDF report first.');return;}
    if(file.type!=='application/pdf'||!file.name.toLowerCase().endsWith('.pdf')){setError('For safety, only PDF reports are accepted.');return;}
    if(file.size>MAX_BYTES){setError('This file exceeds the 20 MB limit. Choose a smaller PDF.');return;}
    if(!patientId){setError('No linked patient profile was found. Please contact LIVYA staff.');return;}
    setUploading(true);
    const path=patientId+'/'+crypto.randomUUID()+'.pdf';
    try{
      const {data:auth,error:authError}=await supabase.auth.getUser();
      if(authError||!auth.user)throw new Error('Your session expired. Sign in again to upload the report.');
      const {error:storageError}=await supabase.storage.from('patient-reports').upload(path,file,{contentType:'application/pdf',upsert:false});
      if(storageError)throw storageError;
      const {error:metadataError}=await supabase.from('PatientReport').insert({
        id:crypto.randomUUID(),patientId,reportType,title:title.trim()||file.name.replace(/\.pdf$/i,''),
        reportDate,originalFileName:file.name,storagePath:path,mimeType:'application/pdf',fileSize:file.size,
        extractionStatus:'NOT_STARTED',reviewStatus:'PENDING',uploadedBy:auth.user.id,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
      });
      if(metadataError){await supabase.storage.from('patient-reports').remove([path]);throw metadataError;}
      setFile(null);setTitle('');setNotice('Report uploaded securely. It is now available in your report list for viewing. Clinical review may still be pending.');
      const picker=document.getElementById('livya-report-file');if(picker)picker.value='';
      await load();
    }catch(e){setError(e.message||'The report could not be uploaded. Please try again.');}
    finally{setUploading(false);}
  }

  async function openReport(report){
    setError('');
    try{
      const {data,error:signError}=await supabase.storage.from('patient-reports').createSignedUrl(report.storagePath,60);
      if(signError)throw signError;
      if(!data?.signedUrl)throw new Error('A secure viewing link could not be created.');
      window.open(data.signedUrl,'_blank','noopener,noreferrer');
    }catch(e){setError(e.message||'Unable to open this report.');}
  }

  const selected=patients.find(p=>p.id===patientId);
  return <div className="module-page report-center">
    <div className="page-heading"><div><div className="eyebrow">MY HEALTH INFORMATION</div><h1><Icons.FileText size={25}/> Reports &amp; documents</h1><p>{isStaff?'Upload and review reports for the selected patient.':'Upload your lab and medical reports, or open reports already linked to your account.'}</p></div><button className="secondary-button" onClick={load} disabled={loading}><Icons.RefreshCw size={16}/> Refresh</button></div>
    {notice&&<div className="notice success-notice"><Icons.CheckCircle2 size={17}/>{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss"><Icons.X size={15}/></button></div>}
    {error&&<div className="notice error-notice"><Icons.AlertCircle size={17}/>{error}<button onClick={()=>setError('')} aria-label="Dismiss"><Icons.X size={15}/></button></div>}
    <section className="panel" style={{padding:22,marginBottom:20}}>
      <h2 style={{marginTop:0,display:'flex',alignItems:'center',gap:9}}><Icons.UploadCloud size={20}/> Upload a report</h2>
      <p className="muted">PDF only · Maximum 20 MB · Files are stored privately. Uploading a report does not mean a clinician has reviewed it.</p>
      {isStaff&&<label className="form-field" style={{display:'block',marginBottom:14}}>Patient<select value={patientId} onChange={e=>setPatientId(e.target.value)}><option value="">Choose patient</option>{patients.map(p=><option key={p.id} value={p.id}>{p.patientCode} · {p.fullName}</option>)}</select></label>}
      {!isStaff&&<p className="muted">Reports are linked to your own LIVYA patient profile.</p>}
      <form onSubmit={upload} style={{display:'grid',gap:14,maxWidth:720}}>
        <label className="form-field">Report title<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Complete blood count" maxLength={180}/></label>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14}}>
          <label className="form-field">Report category<select value={reportType} onChange={e=>setReportType(e.target.value)}><option value="LAB">Lab test</option><option value="IMAGING">Imaging / scan</option><option value="PRESCRIPTION">Prescription</option><option value="DISCHARGE">Discharge summary</option><option value="OTHER">Other medical document</option></select></label>
          <label className="form-field">Report date<input type="date" value={reportDate} onChange={e=>setReportDate(e.target.value)} required/></label>
        </div>
        <label className="form-field">PDF file<input id="livya-report-file" type="file" accept="application/pdf,.pdf" onChange={e=>setFile(e.target.files?.[0]||null)} required/><small>{file?file.name+' · '+(file.size/1024/1024).toFixed(2)+' MB':'Choose the PDF provided by your laboratory or healthcare provider.'}</small></label>
        <div><button className="primary-button" type="submit" disabled={uploading||loading||!patientId}>{uploading?<Icons.LoaderCircle size={16} className="spin"/>:<Icons.UploadCloud size={16}/>} {uploading?'Uploading securely…':'Upload report'}</button></div>
      </form>
    </section>
    <section className="panel table-panel"><div className="table-toolbar"><div><h2 style={{margin:0}}>Available reports</h2><p className="muted" style={{margin:'5px 0 0'}}>Private files open through a short-lived secure link.</p></div><span className="record-count">{reports.length} reports</span></div>
      {loading?<div className="empty-state"><Icons.LoaderCircle size={24}/><span>Loading reports…</span></div>:reports.length?<div className="table-scroll"><table><thead><tr>{isStaff&&<th>Patient</th>}<th>Report</th><th>Category</th><th>Report date</th><th>Review status</th><th>File size</th><th>Actions</th></tr></thead><tbody>{reports.map(r=><tr key={r.id}>{isStaff&&<td>{patients.find(p=>p.id===r.patientId)?.fullName||'Patient'}</td>}<td><b>{r.title}</b><div className="muted">{r.originalFileName}</div></td><td>{r.reportType}</td><td>{dateLabel(r.reportDate)}</td><td><span className={'status-pill status-'+String(r.reviewStatus||'PENDING').toLowerCase()}>{r.reviewStatus==='PENDING'?'Awaiting clinical review':r.reviewStatus==='REVIEWED'?'Reviewed':r.reviewStatus||'Pending'}</span></td><td>{(Number(r.fileSize||0)/1024/1024).toFixed(2)} MB</td><td><button className="secondary-button compact" onClick={()=>openReport(r)}><Icons.ExternalLink size={14}/> View PDF</button></td></tr>)}</tbody></table></div>:<div className="empty-state table-empty"><Icons.FileText size={28}/><b>No reports uploaded yet</b><span>Reports you upload or that your care team shares with you will appear here.</span></div>}
    </section>
    <p className="muted" style={{fontSize:12,marginTop:16}}>Health information is private. Only you and authorized LIVYA staff can access reports linked to your patient profile. Automated extraction and clinical interpretation are not enabled by this upload screen.</p>
  </div>;
}
