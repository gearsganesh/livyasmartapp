const API_URL=(import.meta.env.VITE_API_URL||'http://localhost:4000').replace(/\/$/,'');
export async function api(path,{method='GET',body,headers={}}={}){
 const response=await fetch(`${API_URL}/api${path}`,{method,credentials:'include',headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
 if(response.status===204)return null;
 const data=await response.json().catch(()=>({}));
 if(!response.ok){if(response.status===401&&typeof window!=='undefined')window.dispatchEvent(new Event('livya:unauthorized'));const e=new Error(data.error||`Request failed (${response.status})`);e.status=response.status;e.fields=data.fields;throw e;}
 return data;
}
export const authApi={login:(email,password)=>api('/auth/login',{method:'POST',body:{email,password}}),register:(email,password,fullName)=>api('/auth/register',{method:'POST',body:{email,password,fullName}}),logout:()=>api('/auth/logout',{method:'POST'}),me:()=>api('/auth/me')};
