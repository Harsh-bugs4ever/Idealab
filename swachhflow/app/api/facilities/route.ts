import snapshot from '@/public/osm-facilities.json';
let cached:{at:number;data:unknown}|null=null;
export async function GET(request:Request){
 if(cached&&Date.now()-cached.at<3600000)return Response.json(cached.data);
 try{
  const query='[out:json][timeout:15];nwr[amenity=toilets](19.24,72.77,19.33,72.91);out center tags;';
  const refresh=new URL(request.url).searchParams.get('refresh')==='1';
  let json=snapshot as unknown as {elements:Array<{type:string;id:number;lat?:number;lon?:number;center?:{lat:number;lon:number};tags?:Record<string,string>}>};
  let retrievedAt='2026-10-25T06:26:48Z';
  if(refresh){const res=await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,{headers:{'User-Agent':'SwachhFlow/1.0 public-facility-research'},signal:AbortSignal.timeout(20000)});if(!res.ok)throw new Error('Source unavailable');json=await res.json() as typeof json;retrievedAt=new Date().toISOString();}
  const facilities=json.elements.flatMap(e=>{const lat=e.lat??e.center?.lat;const lng=e.lon??e.center?.lon;const t=e.tags||{};if(lat===undefined||lng===undefined)return [];return [{id:`osm-${e.type}-${e.id}`,name:t.name||`Mapped toilet · ${e.type} ${e.id}`,locality:t['addr:suburb']||t['addr:city']||'Mira Bhayandar search area',lng,lat,status:'Unknown',accessible:t.wheelchair==='yes'?'Yes':t.wheelchair==='no'?'No':'Unknown',water:'Unknown',lastCleaned:null,verifiedAt:null,source:'OpenStreetMap contributors',sourceUrl:`https://www.openstreetmap.org/${e.type}/${e.id}`,retrievedAt,coordinateProvenance:e.center?'OSM geometry centre; entrance not verified':'OSM mapped point; not field verified',demo:false,openingHours:t.opening_hours||'Unknown'}];});
  const data={facilities,retrievedAt,note:'Community-mapped locations within a bounding box; municipal boundary and current conditions have not been field verified. Not a complete inventory.'};cached={at:Date.now(),data};return Response.json(data);
 }catch{return Response.json({facilities:[],error:'Public map source could not be reached. No verified facility inventory is available. Demo data remains separate.'},{status:503});}
}
