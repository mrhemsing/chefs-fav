import {createIcons, Search, SlidersHorizontal, ArrowUpRight, ArrowRight, X, Heart, MapPin, Map, List, Plus, Minus, Coffee, Wine, Utensils, Croissant, Check, Info, ChevronDown, Navigation, Pizza, Fish, Drumstick, Gem, Users, Beer, Sandwich, EggFried, IceCreamBowl, Soup, Beef, Store, Compass, Flame, Sparkles} from 'lucide';
import './style.css';
import {locationLines, matchesLocation, matchesRegion} from './locations.js';

const icons={Search,SlidersHorizontal,ArrowUpRight,ArrowRight,X,Heart,MapPin,Map,List,Plus,Minus,Coffee,Wine,Utensils,Croissant,Check,Info,ChevronDown,Navigation,Pizza,Fish,Drumstick,Gem,Users,Beer,Sandwich,EggFried,IceCreamBowl,Soup,Beef,Store,Compass,Flame,Sparkles};
const icon=(name,cls='')=>`<i data-lucide="${name}" class="${cls}"></i>`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
const refreshIcons=()=>createIcons({icons,attrs:{'stroke-width':1.7}});
let saved;try{saved=new Set(JSON.parse(localStorage.getItem('chefs-fav-saved')||'[]'))}catch{saved=new Set()}
history.scrollRestoration='manual';
const state={query:'',category:'All',chef:'all',saved:false,view:'list',expanded:false,mode:'chefs',location:null,region:'all'};
let data, selected=null, previousFocus;
let directoryScroll=0, directoryQuery='', directoryPanelScroll=0;
function rememberView(){
 const snapshot={state:{...state},scroll:window.scrollY,panelScroll:$('.explore').scrollTop,pick:selected};
 history.replaceState({...history.state,viewSnapshot:snapshot},'',location.href);
}
function selectLocation(scope){
 rememberView();closeModal(true);
 Object.assign(state,{region:'all',location:scope,mode:'picks',chef:'all',query:'',category:'All',saved:false});
 history.pushState({locationEntry:true},'','#location/'+encodeURIComponent(JSON.stringify(scope)));
 syncFilterControls();renderResults();window.scrollTo({top:0,behavior:'instant'});
 $('#clear-location').focus({preventScroll:true});announce('Showing all picks in '+scope.name);
}
function syncFilterControls(){
 $('#search').value=state.query;$('#chef-select').value=state.chef;
 $('.saved-toggle').setAttribute('aria-pressed',state.saved);
 document.querySelectorAll('[data-category]').forEach(b=>{const active=b.dataset.category===state.category;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active)});
}
function clearLocation(){
 if(history.state?.locationEntry){history.back();return}
 state.location=null;state.query='';state.category='All';state.saved=false;state.chef='all';state.mode='picks';
 history.replaceState({},'','#chef/all');syncFilterControls();renderResults();$('#search').focus();
}
function renderLocationFilter(){
 const el=$('#location-filter');el.hidden=!state.location;
 el.innerHTML=state.location?`<button id="location-back">${icon('arrow-right','back-arrow')} Back</button><span>All picks in <b>${esc(state.location.name)}</b>${state.location.city?`<small>${esc(state.location.city)}</small>`:''}</span><button id="clear-location" aria-label="Clear location filter">${icon('x')} Clear</button>`:'';
 $('#location-back')?.addEventListener('click',clearLocation);$('#clear-location')?.addEventListener('click',clearLocation);
}
function restoreLocationRoute(){
 const snapshot=history.state?.viewSnapshot;
 if(snapshot){
  closeModal(true);Object.assign(state,snapshot.state);syncFilterControls();renderResults();
  window.scrollTo({top:snapshot.scroll,behavior:'instant'});$('.explore').scrollTop=snapshot.panelScroll;
  if(snapshot.pick)openPlace(snapshot.pick,true);
  return true;
 }
 const parts=location.hash.slice(1).split('/').map(decodeURIComponent);
 if(parts[0]!=='location')return false;
 let scope;try{scope=JSON.parse(parts[1]);if(!['area','city'].includes(scope.type)||typeof scope.name!=='string'||(scope.type==='area'&&typeof scope.city!=='string'))return false}catch{return false}
 closeModal(true);Object.assign(state,{region:'all',location:scope,mode:'picks',chef:'all',query:'',category:'All',saved:false});
 syncFilterControls();renderResults();
 if(parts[2]==='pick'&&data.places.some(p=>p.id===parts[3]))openPlace(parts[3],true);
 return true;
}
function avatar(c,classes=''){
 const p=c.facePosition||[36,30];
 return `<span class="avatar ${classes}" style="--fx:${p[0]}%;--fy:${p[1]}%" aria-hidden="true"><span class="initials">${esc(c.name.split(' ').map(x=>x[0]).slice(0,2).join(''))}</span><img src="${esc(c.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()"></span>`;
}
function categoryQuestion(category){
 const c=pickGroup(category);
 const questions={
  'Last Meal That Blew Them Away':'Last meal that blew them away?',
  'Take an Out of Town Guest':'Where would they take an out-of-town guest?',
  'Dying to Try':'Where are they dying to try?',
  'Dying to Go Back to':'Where are they dying to go back to?',
  'Outside of Vancouver':'Favourite spot outside Vancouver?',
  'Neighbourhood Favourites':'Favourite neighbourhood spots?',
  'Food Neighbourhood':'Favourite food neighbourhood?',
  'Easy on the Wallet':'Favourite budget-friendly spot?',
  'Family Friendly':'Favourite family-friendly spot?',
  'Family Meal':'Favourite spot for a family meal?',
  'Family Dinner':'Favourite spot for a family dinner?',
  'Meal for Families With Kids':'Favourite spot for a meal with kids?',
  'Spot for a Family Lunch':'Favourite spot for a family lunch?',
  'Natural Winemaker in BC':'Favourite natural winemaker in BC?'
 };
 if(questions[c])return questions[c];
 const neighbourhood=c.match(/^Neighbourhood (?:Favourites|Spots?|Restaurant) \((.+)\)$/i);
 if(neighbourhood)return `Favourite spots in ${neighbourhood[1]}?`;
 const areas=['Salt Spring Island','Commercial Drive','Penticton, BC','- Tofino','- Ucluelet','- Vancouver','Hastings Sunrise','White Rock','Sturdies Bay (Galiano Ferry Terminal)'];
 if(areas.includes(c))return `Favourite spots in ${c.replace(/^- /,'')}?`;
 if(c==='Commercial Drive (Neighbourhood)')return 'Favourite spots on Commercial Drive?';
 if(c==='Gastown (Neighbourhood)')return 'Favourite spots in Gastown?';
 if(c==='Chinatown favourite')return 'Favourite spots in Chinatown?';
 const label=c.replace(/\b[A-Z][a-z]+\b/g,word=>['Vietnamese','Italian','Mexican','Japanese','Thai','French','Chinese','Indian','Filipino','Caribbean','Spanish','Korean','Greek','Taiwanese','Vancouver','Chinatown','Victoria','Pender','Ladner','Coquitlam'].includes(word)?word:word.toLowerCase());
 return `Favourite ${label}?`;
}
function categoryLabel(category){return esc(categoryQuestion(category))}
function categoryFor(m){let c=m.category.toLowerCase();if(/coffee|chai/.test(c))return 'Coffee';if(/cocktail|brewery|wine|pub|bar$/.test(c))return 'Drinks';if(/bakery|pastry|ice cream|gelato/.test(c))return 'Sweet';return 'Bites'}
function placeLocation(p){const city=(p.city||'').trim();return /^(British Columbia|B\.?C\.?|Vancouver)$/i.test(city)?'':city}
function locationMarkup(label){return `<span class="location-lines">${locationLines(label).map(line=>`<span>${line.map(({name,scope})=>scope?`<button type="button" class="location-link" data-location="${esc(JSON.stringify(scope))}" aria-label="Show all picks in ${esc(name)}${scope.city?', '+esc(scope.city):''}">${esc(name)}</button>`:esc(name)).join(' / ')}</span>`).join('')}</span>`}
function locationLabel(c){const area=(c.location?.neighbourhood||'').trim(),city=(c.location?.city||'').trim();if(!area)return placeLocation({city});if(!city||area.toLowerCase().includes(city.toLowerCase()))return area;return [area,city].join(' · ')}
function chefFor(id){return data.chefs.find(c=>c.id===id)}
function mentions(p){return p.mentions.filter(m=>(state.chef==='all'||m.chefId===state.chef)&&(state.category==='All'||pickGroup(m.category)===state.category))}
function filtered(){const q=state.query.toLowerCase().trim();return data.places.filter(p=>matchesRegion(p.city,state.region)&&matchesLocation(placeLocation(p),state.location)&&mentions(p).length&&(!state.saved||saved.has(p.id))&&(!q||[p.name,p.city,...p.mentions.map(m=>m.category+' '+chefFor(m.chefId).name+' '+chefFor(m.chefId).affiliation+' '+locationLabel(chefFor(m.chefId))+' '+(chefFor(m.chefId).location?.region||''))].join(' ').toLowerCase().includes(q))).sort((a,b)=>a.name.localeCompare(b.name))}
function save(id){saved.has(id)?saved.delete(id):saved.add(id);try{localStorage.setItem('chefs-fav-saved',JSON.stringify([...saved]))}catch{}renderResults();if(selected===id)renderDetail(data.places.find(p=>p.id===id));announce(saved.has(id)?'Saved to your shortlist':'Removed from your shortlist')}
function announce(text){$('#live').textContent=text}

async function init(){
 document.body.classList.add('list-view','no-map');
 $('#app').innerHTML=`<div class="boot"><img src="/favicon.svg" alt=""><h1>Good taste is loading.</h1><p>Pulling up a seat at BC’s favourite spots…</p></div>`;
 try{const response=await fetch('/map-data.json');if(!response.ok)throw new Error();data=await response.json()}catch{$('#app').innerHTML='<div class="boot"><h1>We couldn’t load the picks.</h1><p>Check your connection and try again.</p><button onclick="location.reload()">Try again</button></div>';return}
 $('#app').innerHTML=`
 <header class="masthead"><a class="brand" href="/" aria-label="Mates on Crates home"><img src="/favicon.svg" alt=""><h1>MATES ON CRATES</h1></a><div class="head-actions"><span class="region-badge">${icon('map-pin')} British Columbia <span class="status-dot"></span></span><button class="icon-button saved-toggle" aria-label="Show saved places" aria-pressed="false">${icon('heart')}<span class="saved-count">${saved.size}</span></button><button class="icon-button about" aria-label="About this guide">${icon('info')}</button></div></header>
 <nav id="profile-nav" aria-label="Profile navigation" hidden></nav><main class="layout">
 <aside class="explore"><div class="intro"><p class="intro-lead">What’s your favourite pizza? Sushi? The last meal that blew you away?</p><p>Those in the know know that the best conversations in hospitality happen on a humble milk crate.</p><p>From those sacred perches, Mates on Crates introduces you to top hospitality professionals to uncover their favourites and get local recommendations from the insiders who know the industry best.</p><div class="intro-footer"><div class="mini-faces">${data.chefs.slice(0,4).map(c=>avatar(c)).join('')}</div><span><b>${data.chefs.length} chefs & owners</b><br>sharing their BC favourites</span><span class="hand-arrow">↘</span></div></div>
 <div class="discovery"><div class="discovery-mode" role="group" aria-label="Explore mode"><button data-mode="chefs" class="active" aria-pressed="true">Meet the mates</button><button data-mode="picks" aria-pressed="false">All picks</button></div><label class="search-box">${icon('search')}<input id="search" type="search" placeholder="A spot, a chef, a craving…" autocomplete="off" aria-label="Search places, chefs and cravings"><kbd>/</kbd></label>
 <div class="region-filter" role="group" aria-label="Filter by region">${[["all","All BC"],["mainland","Mainland"],["islands","Islands"]].map(([value,label])=>`<button type="button" data-region="${value}" aria-pressed="${value===state.region}">${label}</button>`).join('')}</div><div id="location-filter" hidden></div>
 <div class="chef-filter"><label for="chef-select">${icon('sliders-horizontal')} Follow a chef</label><select id="chef-select"><option value="all">Everyone’s favourites</option>${data.chefs.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></div></div>
 <section class="results" aria-label="Recommendations"><button class="sheet-handle" aria-label="Expand recommendations" aria-expanded="false"><span></span></button><div class="results-heading"><div><h2 id="result-title"></h2><p id="result-count" aria-live="polite"></p></div></div><div id="selected-profile"></div><div id="cards"></div><div class="list-footer"><p>Sourced from<br><a href="https://chefsfav.com/blog" target="_blank" rel="noopener">Chef’s Favourite · Mates on Crates ${icon('arrow-up-right')}</a></p><button class="text-button about">Read our coverage notes ${icon('arrow-right')}</button><span>© ${new Date().getFullYear()} · <a href="https://b-average.com" target="_blank" rel="noopener">b-average</a></span></div></section>
 </aside>
 </main><div id="mobile-return" hidden></div><div id="modal-root"></div><div id="live" class="sr-only" role="status" aria-live="polite"></div>`;
 document.querySelectorAll('[data-region]').forEach(b=>b.addEventListener('click',()=>{state.region=b.dataset.region;state.location=null;renderResults();announce('Region: '+b.textContent)}));
 $('#search').addEventListener('input',e=>{state.query=e.target.value;renderResults()});
 $('#chef-select').addEventListener('change',e=>{state.chef=e.target.value;state.mode=e.target.value==='all'?'chefs':'picks';renderResults();fitMap()});
 document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{state.location=null;state.mode=b.dataset.mode;state.chef='all';history.pushState({chef:'all'},'',state.mode==='picks'?'#chef/all':location.pathname);$('#chef-select').value='all';renderResults();fitMap()}));
 document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{state.category=b.dataset.category;document.querySelectorAll('[data-category]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',x===b)});renderResults()}));
 $('.saved-toggle').addEventListener('click',()=>{state.saved=!state.saved;if(state.saved)state.mode='picks';$('.saved-toggle').setAttribute('aria-pressed',state.saved);renderResults()});
 document.querySelectorAll('.about').forEach(b=>b.addEventListener('click',showAbout));
 $('.sheet-handle').addEventListener('click',()=>{state.expanded=!state.expanded;applySheet()});
 let startY=null;$('.sheet-handle').addEventListener('pointerdown',e=>{startY=e.clientY;e.currentTarget.setPointerCapture(e.pointerId)});$('.sheet-handle').addEventListener('pointerup',e=>{if(startY!==null&&Math.abs(e.clientY-startY)>25){state.expanded=e.clientY<startY;applySheet()}startY=null});
 document.addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();$('#search').focus()}if(e.key==='Escape'){if($('#modal-root').children.length)closeModal();else if(state.chef!=='all')backToChefs()}});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-location]');if(!b||b.closest('[inert]'))return;e.preventDefault();e.stopPropagation();selectLocation(JSON.parse(b.dataset.location))});
 renderResults();if(location.hash)restoreRoute();refreshIcons();
}
function applySheet(){document.body.classList.toggle('sheet-expanded',state.expanded);$('.sheet-handle').setAttribute('aria-expanded',state.expanded);$('.sheet-handle').setAttribute('aria-label',state.expanded?'Collapse recommendations':'Expand recommendations')}
function fitMap(){}
function visibleChefs(){const q=state.query.toLowerCase().trim();return data.chefs.filter(c=>matchesRegion(c.location?.city||'',state.region)&&(!q||[c.name,c.affiliation,locationLabel(c),c.location?.region].join(' ').toLowerCase().includes(q))).sort((a,b)=>(b.publishedAt||'').localeCompare(a.publishedAt||''))}
function selectChef(id){directoryScroll=window.scrollY;directoryPanelScroll=$('.explore').scrollTop;directoryQuery=state.query;openPicksOverlay();history.pushState({chef:id},'', '#chef/'+encodeURIComponent(id));state.query='';$('#search').value='';state.mode='picks';state.chef=id;$('#chef-select').value=id;state.expanded=false;applySheet();renderResults();fitMap();window.scrollTo({top:0,behavior:'instant'});$('.explore').scrollTop=0;announce(chefFor(id).name+'’s recommendations are now shown')}
function renderChefs(){
 const cs=visibleChefs();$('#result-title').hidden=false;$('#result-title').textContent='YEEE-AAW';$('#result-count').textContent=`${cs.length} profiles · newest first`;
 $('#cards').innerHTML=cs.map(c=>`<article class="place-card chef-profile"><div class="card-open"><img class="crate-photo" src="${esc(c.image)}" alt="${esc(c.name)}’s Mates on Crates episode" loading="lazy"><div class="profile-copy"><span class="place-type">${esc(new Date(c.publishedAt+'T12:00:00').toLocaleDateString('en-CA',{month:'short',day:'numeric',year:'numeric'}))} · EPISODE WRITE-UP</span><h3><button class="card-title" data-chef="${c.id}">${esc(c.name)}</button></h3><p>${esc(c.affiliation)}</p>${locationLabel(c)?`<span class="interview-location">${icon('map-pin')}${locationMarkup(locationLabel(c))}</span>`:''}<button class="profile-cta" data-profile="${c.id}">Explore their picks ${icon('arrow-up-right')}</button></div></div></article>`).join('');
 $('#cards').querySelectorAll('article').forEach(card=>card.addEventListener('click',e=>{if(!e.target.closest('button,a'))card.querySelector('[data-chef]')?.click()}));
 $('#cards').querySelectorAll('[data-profile]').forEach(b=>b.addEventListener('click',()=>selectChef(b.dataset.profile)));
 $('#cards').querySelectorAll('[data-chef]').forEach(b=>b.addEventListener('click',()=>selectChef(b.dataset.chef)));
 refreshIcons();
}
function pickCard(p,i,ms=mentions(p)){const cs=[...new Set(ms.map(m=>m.chefId))].map(chefFor);const wish=ms.every(m=>m.wishList);return `<article class="place-card" style="--order:${Math.min(i,8)}"><div class="card-open"><div class="card-topline"><span class="place-type">${icon(categoryFor(ms[0])==='Coffee'?'coffee':categoryFor(ms[0])==='Drinks'?'wine':'utensils')} <span class="category-label">${categoryLabel(ms[0].category)}</span></span>${placeLocation(p)?`<span class="place-city">${locationMarkup(placeLocation(p))}</span>`:''}</div><h3><button class="card-title" data-place="${p.id}" aria-label="Explore ${esc(p.name)}">${esc(p.name)}</button></h3><div class="recommendation"><div class="face-stack">${avatar(cs[0])}</div><div><span>${wish?'On the wish list of':'Picked by'} <b>${esc(cs[0].name.split(' ')[0])}</b></span><small>${esc(cs[0].affiliation)}</small></div>${icon('arrow-up-right','card-arrow')}</div>${cardNote(p,ms)?`<p class="card-comment">${esc(cardNote(p,ms))}</p>`:''}</div><button class="save-button ${saved.has(p.id)?'is-saved':''}" data-save="${p.id}" aria-label="${saved.has(p.id)?'Unsave':'Save'} ${esc(p.name)}" aria-pressed="${saved.has(p.id)}">${icon('heart')}</button></article>`}
function pickGroup(category){
 const c=category.replace(/Neighborhood/g,'Neighbourhood').trim();
 if(/^sushi\b/i.test(c))return 'Sushi';
 if(/^coffee\b/i.test(c))return 'Coffee';
 if(c==='(Most Influential) Italian')return 'Italian';
 if(/^(?:family (?:dinner|friendly|meal)|meal for families with kids|spot for a family lunch)$/i.test(c))return 'Family Friendly';
 if(/^neighbourhood (?:favourites?|spots?|pick|restaurant)(?: \(.+\))?$/i.test(c))return 'Neighbourhood Favourites';
 if(['Chinatown favourite','Commercial Drive','Commercial Drive (Neighbourhood)','Gastown (Neighbourhood)','Hastings Sunrise'].includes(c))return 'Neighbourhood Favourites';
 if(c==='Hangover Brunch')return 'Hangover Cure';
 if(c==='Chicken sandwich')return 'Sandwich';

 if(/^(?:barbecue|bbq)(?: pork)?$/i.test(c))return 'Barbecue';
 if(/meal.*blew/i.test(c))return 'Last Meal That Blew Them Away';
 if(/out.of.town guest/i.test(c))return 'Take an Out of Town Guest';
 if(/^pizza\b/i.test(c))return 'Pizza';
 if(/^date night(?: spot)?$/i.test(c))return 'Date Night';
 if(/^ice cream(?:\/gelato)?$/i.test(c))return 'Ice Cream & Gelato';
 if(/^thai(?: food)?$/i.test(c))return 'Thai';
 if(/^pastry(?: program)?$/i.test(c))return 'Pastry';
 if(/^late night (?:bite|spot)$/i.test(c))return 'Late Night Bite';
 if(/^neighbourhood (?:favourite|favourites|pick|restaurant)$/i.test(c))return 'Neighbourhood Favourites';
 if(/^hidden gem/i.test(c))return 'Hidden Gem';
 if(/^dying to try$/i.test(c))return 'Dying to Try';
 if(/^(favourite )?food neighbourhood/i.test(c))return 'Food Neighbourhood';
 return c;
}
const crateMark='<svg class="section-crate" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 9 16 3l12 6v16l-12 5-12-5Z M4 9l12 5 12-5M16 14v16M4 14l12 5 12-5M4 20l12 5 12-5M9 11v16M23 11v16" stroke-linejoin="round"/></svg>';
function renderPickGroups(ps,individual){
 if(individual)return ps.map((p,i)=>pickCard(p,i)).join('');
 const groups=new globalThis.Map();
 for(const p of ps){
  const byCategory=new globalThis.Map();
  for(const m of mentions(p)){const key=pickGroup(m.category);if(!byCategory.has(key))byCategory.set(key,[]);byCategory.get(key).push(m)}
  for(const [key,ms] of byCategory){if(!groups.has(key))groups.set(key,[]);groups.get(key).push({p,ms})}
 }
 const priority=['Last Meal That Blew Them Away','Pizza','Sushi','Fried Chicken','Coffee','Cocktail Bar','Hidden Gem','Take an Out of Town Guest','Food Neighbourhood'];
 const rank=k=>priority.includes(k)?priority.indexOf(k):priority.length;
 return [...groups].sort(([a],[b])=>rank(a)-rank(b)||a.localeCompare(b)).map(([name,items],i)=>`<section class="pick-section" aria-labelledby="pick-section-${i}"><h2 id="pick-section-${i}" class="pick-section-title">${crateMark}<span>${esc(categoryQuestion(name))}</span></h2><div class="pick-section-cards">${items.map(({p,ms},j)=>pickCard(p,j,ms)).join('')}</div></section>`).join('');
}
function renderResults(){
 document.querySelectorAll('[data-category]').forEach(b=>{b.classList.toggle('active',b.dataset.category===state.category);b.setAttribute('aria-pressed',b.dataset.category===state.category)});
 document.querySelectorAll('[data-region]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.region===state.region));
 renderLocationFilter();
 const activeChef=state.chef!=='all'?chefFor(state.chef):null;
 if(activeChef)openPicksOverlay();else dismissPicksOverlay();
 $('#search').placeholder=state.mode==='chefs'?'Chef, restaurant, neighbourhood or city…':'A spot, a chef, a craving…';
 $('#profile-nav').hidden=!activeChef;
 document.body.classList.toggle('viewing-chef',Boolean(activeChef));
 $('#mobile-return').hidden=!activeChef;
 $('#mobile-return').innerHTML=activeChef?`<button id="mobile-back-chefs" aria-label="Back to chef list">${icon('arrow-right','back-arrow')} Back to chef list</button>`:'';
 $('#mobile-back-chefs')?.addEventListener('click',backToChefs);
 $('#profile-nav').innerHTML=activeChef?`<button id="nav-back-chefs">${icon('arrow-right','back-arrow')} Back to chef list</button><span>${esc(activeChef.name)}</span><button id="close-picks-overlay" aria-label="Close picks and return to chef list">${icon('x')}</button>`:'';
 $('#nav-back-chefs')?.addEventListener('click',backToChefs);
 $('#close-picks-overlay')?.addEventListener('click',backToChefs);

 document.body.classList.toggle('chef-directory',state.mode==='chefs');
 $('#selected-profile').innerHTML=activeChef?`<div class="selected-chef"><img src="${esc(activeChef.image)}" alt="${esc(activeChef.name)}’s crate interview"><div><button id="back-chefs">${icon('arrow-right','back-arrow')} Back to chef list</button><h2>${esc(activeChef.name)}</h2><p>${esc(activeChef.affiliation)}</p>${locationLabel(activeChef)?`<span class="interview-location">${icon('map-pin')}${locationMarkup(locationLabel(activeChef))}</span>`:''}<a href="${esc(activeChef.episode)}" target="_blank" rel="noopener">Watch their episode ↗</a></div></div>`:'';
 $('#back-chefs')?.addEventListener('click',backToChefs);
 document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===state.mode);b.setAttribute('aria-pressed',b.dataset.mode===state.mode)});
 if(state.mode==='chefs'){renderChefs();return}

 const ps=filtered(), mapped=ps.filter(p=>p.coordinates).length;
 $('#result-title').textContent=state.location?'Picks in '+state.location.name:state.saved?'Your little black book':state.chef==='all'?'':chefFor(state.chef).name+ '’s picks';
 $('#result-title').hidden=!$('#result-title').textContent;
 $('#result-count').textContent=`${ps.length} personal picks`;
 $('.saved-count').textContent=saved.size;
 $('#cards').innerHTML=ps.length?renderPickGroups(ps,Boolean(activeChef)):`<div class="empty-state"><span>🍽️</span><h3>No bites here. Yet.</h3><p>${state.saved?'Save a few spots with the heart button, or try different filters.':'Try another chef, craving or neighbourhood.'}</p><button id="reset-filters">Reset filters</button></div>`;
 $('#cards').querySelectorAll('article').forEach(card=>card.addEventListener('click',e=>{if(!e.target.closest('button,a'))card.querySelector('[data-place]')?.click()}));
 $('#cards').querySelectorAll('[data-place]').forEach(b=>b.addEventListener('click',()=>openPlace(b.dataset.place)));
 $('#cards').querySelectorAll('[data-save]').forEach(b=>b.addEventListener('click',()=>save(b.dataset.save)));
 $('#reset-filters')?.addEventListener('click',()=>{state.region='all';state.location=null;state.query='';state.chef='all';state.category='All';state.saved=false;$('#search').value='';$('#chef-select').value='all';$('.saved-toggle').setAttribute('aria-pressed','false');document.querySelectorAll('[data-category]').forEach(b=>{b.classList.toggle('active',b.dataset.category==='All');b.setAttribute('aria-pressed',b.dataset.category==='All')});renderResults()});
 refreshIcons();
}
function openPlace(id,fromHistory=false){if(!fromHistory){rememberView();history.pushState({chef:state.chef,pick:id},'', (state.location?'#location/'+encodeURIComponent(JSON.stringify(state.location)):'#chef/'+encodeURIComponent(state.chef))+'/pick/'+encodeURIComponent(id));}const p=data.places.find(p=>p.id===id);selected=id;previousFocus=document.activeElement;renderDetail(p);$('#dialog-close').focus()}
function showModal(html){$('#modal-root').innerHTML=`<div class="modal-backdrop"><section class="detail-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">${html}</section></div>`;document.body.classList.add('modal-open');$('.modal-backdrop').addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal()});$('#dialog-close').addEventListener('click',()=>closeModal());$('.detail-dialog').addEventListener('keydown',e=>{if(e.key!=='Tab')return;const fs=[...e.currentTarget.querySelectorAll('button:not([disabled]),a[href],input')];if(e.shiftKey&&document.activeElement===fs[0]){e.preventDefault();fs.at(-1).focus()}else if(!e.shiftKey&&document.activeElement===fs.at(-1)){e.preventDefault();fs[0].focus()}});refreshIcons()}
function closeModal(fromHistory=false){if(!fromHistory&&history.state?.pick){history.back();return}if(!$('#modal-root')?.children.length)return;$('#modal-root').innerHTML='';document.body.classList.remove('modal-open');selected=null;if(previousFocus?.isConnected)previousFocus.focus()}
function sourceLinksHtml(ms){
 return [...new globalThis.Map(ms.map(m=>[m.source,m])).values()].map(m=>`<a class="source-link" href="${esc(m.source)}" target="_blank" rel="noopener">${m.evidenceType==='video_transcript_and_caption_review'?'Video recommendation':'Official expanded list'} ${icon('arrow-up-right')}</a>`).join(' · ');
}
function cardNote(p,ms){return (state.chef!=='all'?(p.comments||[]).find(n=>n.chefId===state.chef)?.comment:null)||ms.find(m=>m.neighbourhoodContext)?.neighbourhoodContext||''}
function commentHtml(p, chefId){
 const notes=(p.comments||[]).filter(n=>n.chefId===chefId);
 if(!notes.length){const m=p.mentions.find(m=>m.chefId===chefId&&m.neighbourhoodContext);if(m)return `<div class="chef-comment"><span class="comment-label">NEIGHBOURHOOD PICK</span><p>${esc(m.neighbourhoodContext)}</p><a href="${esc(m.source)}" target="_blank" rel="noopener">Official expanded list ↗</a></div>`;}
 return notes.map(n=>`<div class="chef-comment"><span class="comment-label">WHY THEY LOVE IT <small>Summary</small></span><p>${esc(n.comment)}</p><a href="${esc(n.source)}" target="_blank" rel="noopener">${icon('arrow-right')} Video · ${Math.floor(n.startSeconds/60)}:${String(n.startSeconds%60).padStart(2,'0')} ${icon('arrow-up-right')}</a></div>`).join('');
}
function renderDetail(p){
 const allms=state.chef==='all'?p.mentions:p.mentions.filter(m=>m.chefId===state.chef);const chefIds=[...new Set(allms.map(m=>m.chefId))];
 showModal(`<div class="detail-top"><button class="back-to-picks" id="back-picks">${icon('arrow-right','back-arrow')} Back to picks</button><button class="icon-button" id="dialog-close" aria-label="Close details">${icon('x')}</button></div><div class="detail-heading">${placeLocation(p)?`<span class="location-tag">${icon('map-pin')} ${locationMarkup(placeLocation(p))}</span>`:''}<h2 id="dialog-title">${esc(p.name)}</h2><p>${esc(p.branchUnspecified?'Several locations or a changing food-truck schedule; the source does not specify a branch.':p.address||(!placeLocation(p)?'Location not yet verified':''))}</p></div><div class="detail-chefs">${chefIds.map(id=>{const c=chefFor(id),ms=allms.filter(m=>m.chefId===id);return `<div class="chef-endorsement"><div class="chef-intro">${avatar(c,'large')}<div><b>${esc(c.name)}</b><span>${esc(c.affiliation)}</span></div><a href="${esc(c.episode||c.source)}" target="_blank" rel="noopener" class="episode-link" aria-label="Open ${esc(c.name)}’s episode">${icon('arrow-up-right')}</a></div><div class="picks">${ms.map(m=>`<span class="pick-tag ${m.wishList?'wish':''}">${m.wishList?'✧ Wants to try':categoryLabel(m.category)}</span>`).join('')}</div>${commentHtml(p,id)}${sourceLinksHtml(ms)}</div>`}).join('')}</div><div class="detail-actions"><a class="primary-action" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name+' '+(p.address||'')+' '+p.city+' BC')}" target="_blank" rel="noopener">Open in Maps ${icon('arrow-up-right')}</a><button class="detail-save ${saved.has(p.id)?'is-saved':''}" id="detail-save" aria-pressed="${saved.has(p.id)}">${icon('heart')} ${saved.has(p.id)?'Saved':'Save spot'}</button></div><p class="detail-note">Check the venue’s current address and opening hours before visiting. Expanded-list picks may include off-camera extras. Video comments are separately labelled as summaries with time cues; tap the video and seek to the shown time. <a href="${esc(p.locationSource||'https://chefsfav.com/blog')}" target="_blank" rel="noopener">${p.locationSource?'Location source':'Publisher'}</a></p>`);
 $('#back-picks').addEventListener('click',()=>closeModal());
 $('#detail-save').addEventListener('click',()=>{save(p.id);$('#detail-save').focus()});
}
function openPicksOverlay(){
 if($('#picks-overlay'))return;
 const source=$('.layout'),snapshot=source.cloneNode(true);snapshot.id='directory-snapshot';snapshot.setAttribute('inert','');snapshot.setAttribute('aria-hidden','true');
 snapshot.querySelectorAll('[class]').forEach(e=>{e.setAttribute('class',(e.getAttribute('class')||'').split(' ').map(c=>'preview-'+c).join(' '))});
 snapshot.querySelectorAll('[id]').forEach(e=>{if(e.id==='cards')e.classList.add('snapshot-cards');e.removeAttribute('id')});
 snapshot.querySelectorAll('*').forEach(e=>{for(const a of [...e.attributes])if(a.name.startsWith('data-'))e.removeAttribute(a.name)});
 source.before(snapshot);source.hidden=true;$('.masthead').inert=true;
 const layer=document.createElement('div');layer.id='picks-overlay';layer.innerHTML='<section class="picks-sheet" role="dialog" aria-modal="true" aria-label="Chef recommendations"><div class="picks-scroll"></div></section>';
 document.body.append(layer);const sheet=layer.querySelector('.picks-sheet'),scroll=layer.querySelector('.picks-scroll');sheet.prepend($('#profile-nav'));scroll.append($('.discovery'),$('.results'));
 document.body.classList.add('picks-overlay-open');
 layer.addEventListener('click',e=>{if(e.target===layer)backToChefs()});
 sheet.addEventListener('keydown',e=>{if(e.key!=='Tab'||$('#modal-root').children.length)return;const fs=[...sheet.querySelectorAll('button:not([disabled]),a[href],input,select')].filter(x=>x.getClientRects().length);if(e.shiftKey&&document.activeElement===fs[0]){e.preventDefault();fs.at(-1).focus()}else if(!e.shiftKey&&document.activeElement===fs.at(-1)){e.preventDefault();fs[0].focus()}});
 requestAnimationFrame(()=>$('#close-picks-overlay')?.focus({preventScroll:true}));
}
function dismissPicksOverlay(){
 if(!$('#picks-overlay'))return;
 const source=$('.layout:not(#directory-snapshot)'),explore=source.querySelector('.explore');explore.append($('.discovery'),$('.results'));source.before($('#profile-nav'));source.hidden=false;$('#picks-overlay').remove();$('#directory-snapshot').remove();document.body.classList.remove('picks-overlay-open');$('.masthead').inert=false;
}
function backToChefs(){const closingChef=state.chef;closeModal(true);history.pushState({},'',location.pathname);state.location=null;state.mode='chefs';state.chef='all';state.query=directoryQuery;state.category='All';state.saved=false;$('#search').value=directoryQuery;$('#chef-select').value='all';renderResults();$('.explore').scrollTop=directoryPanelScroll;window.scrollTo({top:directoryScroll,behavior:'instant'});$('#cards').querySelector('[data-chef="'+closingChef+'"]')?.focus({preventScroll:true});announce('Back to the chef list')}
function restoreRoute(){if(!data)return;if(restoreLocationRoute())return;state.location=null;const parts=location.hash.slice(1).split('/').map(decodeURIComponent);closeModal(true);const id=parts[0]==='chef'?parts[1]:null;if(id&&id!=='all'&&chefFor(id)){state.mode='picks';state.chef=id;$('#chef-select').value=id}else{state.mode=id==='all'?'picks':'chefs';state.chef='all';$('#chef-select').value='all'}renderResults();if(!id){state.query=directoryQuery;$('#search').value=directoryQuery;renderResults();window.scrollTo({top:directoryScroll,behavior:'instant'})}if(parts[2]==='pick'&&data.places.some(p=>p.id===parts[3]))openPlace(parts[3],true)}
window.addEventListener('popstate',restoreRoute);
function showAbout(){previousFocus=document.activeElement;showModal(`<div class="detail-top"><span class="eyebrow">THE SMALL PRINT, SIMPLIFIED</span><button id="dialog-close" class="icon-button" aria-label="Close guide information">${icon('x')}</button></div><div class="about-content"><div class="about-flower">✳</div><h2 id="dialog-title">Good taste.<br>Clear sources.</h2><p>A BC-only discovery guide to the places chefs love outside their own restaurants.</p><div class="stats"><div><b>${data.chefs.length}</b><span>profiles</span></div><div><b>${data.coverage.recommendationAnswers}</b><span>source answers</span></div><div><b>99</b><span>articles indexed</span></div></div><h3>A starting list, not the full series.</h3><p>These recommendations come from Chef’s Favourite’s official expanded <b>Mates on Crates</b> write-ups. We haven’t completed the video review, and some written picks aren’t in the videos. The signed-in archive has now been inventoried: 510 reels, including non-series posts. Spoken comments are being reviewed and added with timestamps; the complete episode review is still in progress.</p><h3>No self-promotion on the menu.</h3><p>Each chef’s own restaurants, workplaces and known affiliated venues are excluded from their picks. The restaurant under a chef’s name is their affiliation—not necessarily a business they own. “Wants to try” picks are wish-list items, not visited recommendations.</p><h3>Before you head out</h3><p>Venue addresses are matched to OpenStreetMap where available. Some chefs don’t name a branch; check the destination and opening hours. Some addresses remain unverified. Saves stay on this device.</p><p>Episode photos and recommendation sources: <a href="https://chefsfav.com" target="_blank" rel="noopener">Chef’s Favourite</a>. Independent research project, not an official Chef’s Favourite app.</p><div class="about-links"><a href="https://github.com/mrhemsing/chefs-fav/blob/main/CHEFS.md" target="_blank" rel="noopener">Full sourced list ${icon('arrow-up-right')}</a><a href="/recommendations.csv" download>Download CSV ${icon('arrow-up-right')}</a></div><p class="detail-note">Research snapshot: November 17, 2026.</p></div>`);$('#dialog-close').focus()}
init();
