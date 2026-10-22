// Human-checked destination metadata travels through the existing approval snapshot.
// No location collection, geocoding, inferred address or taxi integration.
export function validDestination(d){
 if(!d||typeof d!=='object'||Array.isArray(d)||Object.keys(d).sort().join(',')!=='address,latitude,longitude,name,sourceUrl,verified'||typeof d.verified!=='boolean')return false;
 if(!['name','address','latitude','longitude','sourceUrl'].every(k=>typeof d[k]==='string'&&d[k].length<=(k==='sourceUrl'?500:180)))return false;
 if(!d.verified)return true; // Incomplete private draft, never projected to B.
 let url;try{url=new URL(d.sourceUrl)}catch{return false}
 return d.name.trim().length>0&&d.address.trim().length>0&&url.protocol==='https:'&&!url.username&&!url.password&&url.hostname.includes('.')&&
  /^-?\d+(\.\d+)?$/.test(d.latitude)&&/^-?\d+(\.\d+)?$/.test(d.longitude)&&Math.abs(Number(d.latitude))<=90&&Math.abs(Number(d.longitude))<=180;
}
export function directionsURL(destination){
 if(!validDestination(destination)||!destination.verified)return null;
 return `https://map.kakao.com/link/to/${encodeURIComponent(destination.name+' '+destination.address)},${Number(destination.latitude)},${Number(destination.longitude)}`;
}
