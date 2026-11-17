import {createIcons, Search, SlidersHorizontal, ArrowUpRight, ArrowRight, X, Heart, MapPin, Map, List, Shuffle, Plus, Minus, Coffee, Wine, Utensils, Croissant, Check, Info, ChevronDown, Navigation, Sparkles} from 'lucide';
import './style.css';

const icons={Search,SlidersHorizontal,ArrowUpRight,ArrowRight,X,Heart,MapPin,Map,List,Shuffle,Plus,Minus,Coffee,Wine,Utensils,Croissant,Check,Info,ChevronDown,Navigation,Sparkles};
const icon=(name,cls='')=>`<i data-lucide="${name}" class="${cls}"></i>`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
const refreshIcons=()=>createIcons({icons,attrs:{'stroke-width':1.7}});
let saved;try{saved=new Set(JSON.parse(localStorage.getItem('chefs-fav-saved')||'[]'))}catch{saved=new Set()}
const state={query:'',category:'All',chef:'all',saved:false,view:'list',expanded:false,mode:'chefs'};
let data, selected=null, previousFocus;
let directoryScroll=0, directoryQuery='', directoryPanelScroll=0;
function avatar(c,classes=''){
 const p=c.facePosition||[36,30];
 return `<span class="avatar ${classes}" style="--fx:${p[0]}%;--fy:${p[1]}%" aria-hidden="true"><span class="initials">${esc(c.name.split(' ').map(x=>x[0]).slice(0,2).join(''))}</span><img src="${esc(c.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()"></span>`;
}
function categoryFor(m){let c=m.category.toLowerCase();if(/coffee|chai/.test(c))return 'Coffee';if(/cocktail|brewery|wine|pub|bar$/.test(c))return 'Drinks';if(/bakery|pastry|ice cream|gelato/.test(c))return 'Sweet';return 'Bites'}
function locationLabel(c){return [c.location?.neighbourhood,c.location?.city].filter(Boolean).join(' · ')}
function chefFor(id){return data.chefs.find(c=>c.id===id)}
function mentions(p){return p.mentions.filter(m=>(state.chef==='all'||m.chefId===state.chef)&&(state.category==='All'||categoryFor(m)===state.category))}
function filtered(){const q=state.query.toLowerCase().trim();return data.places.filter(p=>mentions(p).length&&(!state.saved||saved.has(p.id))&&(!q||[p.name,p.city,...p.mentions.map(m=>m.category+' '+chefFor(m.chefId).name+' '+chefFor(m.chefId).affiliation+' '+locationLabel(chefFor(m.chefId))+' '+(chefFor(m.chefId).location?.region||''))].join(' ').toLowerCase().includes(q))).sort((a,b)=>a.name.localeCompare(b.name))}
function save(id){saved.has(id)?saved.delete(id):saved.add(id);try{localStorage.setItem('chefs-fav-saved',JSON.stringify([...saved]))}catch{}renderResults();if(selected===id)renderDetail(data.places.find(p=>p.id===id));announce(saved.has(id)?'Saved to your shortlist':'Removed from your shortlist')}
function announce(text){$('#live').textContent=text}

async function init(){
 document.body.classList.add('list-view','no-map');
 $('#app').innerHTML=`<div class="boot"><img src="/favicon.svg" alt=""><h1>Good taste is loading.</h1><p>Pulling up a seat at BC’s favourite spots…</p></div>`;
 try{const response=await fetch('/map-data.json');if(!response.ok)throw new Error();data=await response.json()}catch{$('#app').innerHTML='<div class="boot"><h1>We couldn’t load the picks.</h1><p>Check your connection and try again.</p><button onclick="location.reload()">Try again</button></div>';return}
 $('#app').innerHTML=`
 <header class="masthead"><a class="brand" href="/" aria-label="Chef’s Fav home"><img src="/favicon.svg" alt=""><span>chef’s fav<span class="brand-dot">.</span></span></a><span class="header-caption">GOOD PEOPLE. <b>GREAT TASTE.</b></span><div class="head-actions"><span class="region-badge">${icon('map-pin')} British Columbia <span class="status-dot"></span></span><button class="icon-button saved-toggle" aria-label="Show saved places" aria-pressed="false">${icon('heart')}<span class="saved-count">${saved.size}</span></button><button class="icon-button about" aria-label="About this guide">${icon('info')}</button></div></header>
 <nav id="profile-nav" aria-label="Profile navigation" hidden></nav><main class="layout">
 <aside class="explore"><div class="intro"><div class="eyebrow"><span></span> THE INSIDER’S TABLE</div><h1>Follow<br><span>good taste.</span><span class="doodle">✳</span></h1><p>The places chefs love.<br class="desktop-br"> Not just the places they cook.</p><div class="intro-footer"><div class="mini-faces">${data.chefs.slice(0,4).map(c=>avatar(c)).join('')}</div><span><b>${data.chefs.length} chefs & owners</b><br>sharing their BC favourites</span><span class="hand-arrow">↘</span></div></div>
 <div class="discovery"><div class="discovery-mode" role="group" aria-label="Explore mode"><button data-mode="chefs" class="active" aria-pressed="true">Meet the chefs</button><button data-mode="picks" aria-pressed="false">All picks</button></div><label class="search-box">${icon('search')}<input id="search" type="search" placeholder="A spot, a chef, a craving…" autocomplete="off" aria-label="Search places, chefs and cravings"><kbd>/</kbd></label>
 <div class="category-row" role="group" aria-label="Filter by type">${[['All','sparkles'],['Bites','utensils'],['Coffee','coffee'],['Drinks','wine'],['Sweet','croissant']].map(([name,i])=>`<button data-category="${name}" class="category ${name==='All'?'active':''}" aria-pressed="${name==='All'}">${icon(i)}${name}</button>`).join('')}</div>
 <div class="chef-filter"><label for="chef-select">${icon('sliders-horizontal')} Follow a chef</label><select id="chef-select"><option value="all">Everyone’s favourites</option>${data.chefs.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></div></div>
 <section class="results" aria-label="Recommendations"><button class="sheet-handle" aria-label="Expand recommendations" aria-expanded="false"><span></span></button><div class="results-heading"><div><h2 id="result-title">Good places, good people</h2><p id="result-count" aria-live="polite"></p></div><button class="random-button" aria-label="Surprise me with a recommendation" title="Surprise me">${icon('shuffle')}</button></div><div id="selected-profile"></div><div id="cards"></div><div class="list-footer"><p>Handpicked by chefs. Sourced from<br><a href="https://chefsfav.com/blog" target="_blank" rel="noopener">Chef’s Favourite · Mates on Crates ${icon('arrow-up-right')}</a></p><button class="text-button about">Read our coverage notes ${icon('arrow-right')}</button><span>© ${new Date().getFullYear()} · <a href="https://b-average.com" target="_blank" rel="noopener">b-average</a></span></div></section>
 </aside>
 </main><div id="mobile-return" hidden></div><div id="modal-root"></div><div id="live" class="sr-only" role="status" aria-live="polite"></div>`;
 $('#search').addEventListener('input',e=>{state.query=e.target.value;renderResults()});
 $('#chef-select').addEventListener('change',e=>{state.chef=e.target.value;state.mode=e.target.value==='all'?'chefs':'picks';renderResults();fitMap()});
 document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{state.mode=b.dataset.mode;state.chef='all';$('#chef-select').value='all';renderResults();fitMap()}));
 document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{state.category=b.dataset.category;document.querySelectorAll('[data-category]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',x===b)});renderResults()}));
 $('.saved-toggle').addEventListener('click',()=>{state.saved=!state.saved;if(state.saved)state.mode='picks';$('.saved-toggle').setAttribute('aria-pressed',state.saved);renderResults()});
 document.querySelectorAll('.about').forEach(b=>b.addEventListener('click',showAbout));
 $('.random-button').addEventListener('click',()=>{if(state.mode==='chefs'){const cs=visibleChefs();if(cs.length)selectChef(cs[Math.floor(Math.random()*cs.length)].id);return}const ps=filtered();if(ps.length)openPlace(ps[Math.floor(Math.random()*ps.length)].id)});
 $('.sheet-handle').addEventListener('click',()=>{state.expanded=!state.expanded;applySheet()});
 let startY=null;$('.sheet-handle').addEventListener('pointerdown',e=>{startY=e.clientY;e.currentTarget.setPointerCapture(e.pointerId)});$('.sheet-handle').addEventListener('pointerup',e=>{if(startY!==null&&Math.abs(e.clientY-startY)>25){state.expanded=e.clientY<startY;applySheet()}startY=null});
 document.addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();$('#search').focus()}if(e.key==='Escape'){if($('#modal-root').children.length)closeModal();else if(state.chef!=='all')backToChefs()}});
 renderResults();if(location.hash)restoreRoute();refreshIcons();
}
function applySheet(){document.body.classList.toggle('sheet-expanded',state.expanded);$('.sheet-handle').setAttribute('aria-expanded',state.expanded);$('.sheet-handle').setAttribute('aria-label',state.expanded?'Collapse recommendations':'Expand recommendations')}
function fitMap(){}
function visibleChefs(){const q=state.query.toLowerCase().trim();return data.chefs.filter(c=>!q||[c.name,c.affiliation,locationLabel(c),c.location?.region].join(' ').toLowerCase().includes(q)).sort((a,b)=>(b.publishedAt||'').localeCompare(a.publishedAt||''))}
function selectChef(id){directoryScroll=window.scrollY;directoryPanelScroll=$('.explore').scrollTop;directoryQuery=state.query;openPicksOverlay();history.pushState({chef:id},'', '#chef/'+encodeURIComponent(id));state.query='';$('#search').value='';state.mode='picks';state.chef=id;$('#chef-select').value=id;state.expanded=false;applySheet();renderResults();fitMap();window.scrollTo({top:0,behavior:'instant'});$('.explore').scrollTop=0;announce(chefFor(id).name+'’s recommendations are now shown')}
function renderChefs(){
 const cs=visibleChefs();$('#result-title').textContent='Pull up a crate';$('#result-count').textContent=`${cs.length} profiles · newest first`;
 $('#cards').innerHTML=cs.map(c=>`<article class="place-card chef-profile"><button class="card-open" data-chef="${c.id}"><img class="crate-photo" src="${esc(c.image)}" alt="${esc(c.name)}’s Mates on Crates episode" loading="lazy"><div class="profile-copy"><span class="place-type">${esc(new Date(c.publishedAt+'T12:00:00').toLocaleDateString('en-CA',{month:'short',day:'numeric',year:'numeric'}))} · EPISODE WRITE-UP</span><h3>${esc(c.name)}</h3><p>${esc(c.affiliation)}</p><span class="interview-location">${icon('map-pin')}${esc(locationLabel(c))}</span><span class="profile-cta">Explore their picks ${icon('arrow-up-right')}</span></div></button></article>`).join('');
 $('#cards').querySelectorAll('[data-chef]').forEach(b=>b.addEventListener('click',()=>selectChef(b.dataset.chef)));
 refreshIcons();
}
function renderResults(){
 const activeChef=state.chef!=='all'?chefFor(state.chef):null;
 if(activeChef)openPicksOverlay();else dismissPicksOverlay();
 $('#search').placeholder=state.mode==='chefs'?'Chef, restaurant, neighbourhood or city…':'A spot, a chef, a craving…';
 $('#profile-nav').hidden=!activeChef;
 document.body.classList.toggle('viewing-chef',Boolean(activeChef));
 $('#mobile-return').hidden=!activeChef;
 $('#mobile-return').innerHTML=activeChef?`<button id="mobile-back-chefs" aria-label="Back to chef list">${icon('arrow-right','back-arrow')} Back to chef list</button>`:'';
 $('#mobile-back-chefs')?.addEventListener('click',backToChefs);
 $('#profile-nav').innerHTML=activeChef?`<button id="nav-back-chefs">← Back to chef list</button><span>${esc(activeChef.name)}</span><button id="close-picks-overlay" aria-label="Close picks and return to chef list">${icon('x')}</button>`:'';
 $('#nav-back-chefs')?.addEventListener('click',backToChefs);
 $('#close-picks-overlay')?.addEventListener('click',backToChefs);

 document.body.classList.toggle('chef-directory',state.mode==='chefs');
 $('#selected-profile').innerHTML=activeChef?`<div class="selected-chef"><img src="${esc(activeChef.image)}" alt="${esc(activeChef.name)}’s crate interview"><div><button id="back-chefs">← Back to chef list</button><h2>${esc(activeChef.name)}</h2><p>${esc(activeChef.affiliation)}</p><span class="interview-location">${icon('map-pin')}${esc(locationLabel(activeChef))}</span><a href="${esc(activeChef.episode)}" target="_blank" rel="noopener">Watch their episode ↗</a></div></div>`:'';
 $('#back-chefs')?.addEventListener('click',backToChefs);
 document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===state.mode);b.setAttribute('aria-pressed',b.dataset.mode===state.mode)});
 if(state.mode==='chefs'){renderChefs();return}

 const ps=filtered(), mapped=ps.filter(p=>p.coordinates).length;
 $('#result-title').textContent=state.saved?'Your little black book':state.chef==='all'?'Good places, good people':chefFor(state.chef).name+ '’s picks';
 $('#result-count').textContent=`${ps.length} personal picks`;
 $('.saved-count').textContent=saved.size;
 $('.random-button').disabled=!ps.length;
 $('#cards').innerHTML=ps.length?ps.map((p,i)=>{const ms=mentions(p),cs=[...new Set(ms.map(m=>m.chefId))].map(chefFor);const wish=ms.every(m=>m.wishList);return `<article class="place-card" style="--order:${Math.min(i,8)}"><button class="card-open" data-place="${p.id}" aria-label="Explore ${esc(p.name)}"><div class="card-topline"><span class="place-type">${icon(categoryFor(ms[0])==='Coffee'?'coffee':categoryFor(ms[0])==='Drinks'?'wine':'utensils')} ${esc(ms[0].category)}</span><span class="place-city">${esc(p.city||'BC')}</span></div><h3>${esc(p.name)}</h3><div class="recommendation"><div class="face-stack">${avatar(cs[0])}</div><div><span>${wish?'On the wish list of':'Picked by'} <b>${esc(cs[0].name.split(' ')[0])}</b></span><small>${esc(cs[0].affiliation)}</small></div>${icon('arrow-up-right','card-arrow')}</div>${state.chef!=='all'&&(p.comments||[]).some(n=>n.chefId===state.chef)?`<p class="card-comment">${esc(p.comments.find(n=>n.chefId===state.chef).comment)}</p>`:''}</button><button class="save-button ${saved.has(p.id)?'is-saved':''}" data-save="${p.id}" aria-label="${saved.has(p.id)?'Unsave':'Save'} ${esc(p.name)}" aria-pressed="${saved.has(p.id)}">${icon('heart')}</button></article>`}).join(''):`<div class="empty-state"><span>🍽️</span><h3>No bites here. Yet.</h3><p>${state.saved?'Save a few spots with the heart button, or try different filters.':'Try another chef, craving or neighbourhood.'}</p><button id="reset-filters">Reset filters</button></div>`;
 $('#cards').querySelectorAll('[data-place]').forEach(b=>b.addEventListener('click',()=>openPlace(b.dataset.place)));
 $('#cards').querySelectorAll('[data-save]').forEach(b=>b.addEventListener('click',()=>save(b.dataset.save)));
 $('#reset-filters')?.addEventListener('click',()=>{state.query='';state.chef='all';state.category='All';state.saved=false;$('#search').value='';$('#chef-select').value='all';$('.saved-toggle').setAttribute('aria-pressed','false');document.querySelectorAll('[data-category]').forEach(b=>{b.classList.toggle('active',b.dataset.category==='All');b.setAttribute('aria-pressed',b.dataset.category==='All')});renderResults()});
 refreshIcons();
}
function openPlace(id,fromHistory=false){if(!fromHistory)history.pushState({chef:state.chef,pick:id},'', '#chef/'+encodeURIComponent(state.chef)+'/pick/'+encodeURIComponent(id));const p=data.places.find(p=>p.id===id);selected=id;previousFocus=document.activeElement;renderDetail(p);$('#dialog-close').focus()}
function showModal(html){$('#modal-root').innerHTML=`<div class="modal-backdrop"><section class="detail-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">${html}</section></div>`;document.body.classList.add('modal-open');$('.modal-backdrop').addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal()});$('#dialog-close').addEventListener('click',()=>closeModal());$('.detail-dialog').addEventListener('keydown',e=>{if(e.key!=='Tab')return;const fs=[...e.currentTarget.querySelectorAll('button:not([disabled]),a[href],input')];if(e.shiftKey&&document.activeElement===fs[0]){e.preventDefault();fs.at(-1).focus()}else if(!e.shiftKey&&document.activeElement===fs.at(-1)){e.preventDefault();fs[0].focus()}});refreshIcons()}
function closeModal(fromHistory=false){if(!fromHistory&&history.state?.pick){history.back();return}if(!$('#modal-root')?.children.length)return;$('#modal-root').innerHTML='';document.body.classList.remove('modal-open');selected=null;if(previousFocus?.isConnected)previousFocus.focus()}
function sourceLinksHtml(ms){
 return [...new globalThis.Map(ms.map(m=>[m.source,m])).values()].map(m=>`<a class="source-link" href="${esc(m.source)}" target="_blank" rel="noopener">${m.evidenceType==='video_transcript_and_caption_review'?'Video recommendation':'Official expanded list'} ${icon('arrow-up-right')}</a>`).join(' · ');
}
function commentHtml(p, chefId){
 const notes=(p.comments||[]).filter(n=>n.chefId===chefId);
 return notes.map(n=>`<div class="chef-comment"><span class="comment-label">WHY THEY LOVE IT <small>Summary</small></span><p>${esc(n.comment)}</p><a href="${esc(n.source)}" target="_blank" rel="noopener">${icon('arrow-right')} Video · ${Math.floor(n.startSeconds/60)}:${String(n.startSeconds%60).padStart(2,'0')} ${icon('arrow-up-right')}</a></div>`).join('');
}
function renderDetail(p){
 const allms=state.chef==='all'?p.mentions:p.mentions.filter(m=>m.chefId===state.chef);const chefIds=[...new Set(allms.map(m=>m.chefId))];
 showModal(`<div class="detail-top"><button class="back-to-picks" id="back-picks">← Back to picks</button><button class="icon-button" id="dialog-close" aria-label="Close details">${icon('x')}</button></div><div class="detail-heading"><span class="location-tag">${icon('map-pin')} ${esc(p.city||'British Columbia')}</span><h2 id="dialog-title">${esc(p.name)}</h2><p>${esc(p.address||'British Columbia')}</p></div><div class="detail-chefs">${chefIds.map(id=>{const c=chefFor(id),ms=allms.filter(m=>m.chefId===id);return `<div class="chef-endorsement"><div class="chef-intro">${avatar(c,'large')}<div><b>${esc(c.name)}</b><span>${esc(c.affiliation)}</span></div><a href="${esc(c.episode||c.source)}" target="_blank" rel="noopener" class="episode-link" aria-label="Open ${esc(c.name)}’s episode">${icon('arrow-up-right')}</a></div><div class="picks">${ms.map(m=>`<span class="pick-tag ${m.wishList?'wish':''}">${m.wishList?'✧ Wants to try':esc(m.category)}</span>`).join('')}</div>${commentHtml(p,id)}${sourceLinksHtml(ms)}</div>`}).join('')}</div><div class="detail-actions"><a class="primary-action" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name+' '+(p.address||'')+' '+p.city+' BC')}" target="_blank" rel="noopener">Open in Maps ${icon('arrow-up-right')}</a><button class="detail-save ${saved.has(p.id)?'is-saved':''}" id="detail-save" aria-pressed="${saved.has(p.id)}">${icon('heart')} ${saved.has(p.id)?'Saved':'Save spot'}</button></div><p class="detail-note">Check the venue’s current address and opening hours before visiting. Expanded-list picks may include off-camera extras. Video comments are separately labelled as summaries with time cues; tap the video and seek to the shown time. <a href="${esc(p.locationSource||'https://chefsfav.com/blog')}" target="_blank" rel="noopener">${p.locationSource?'Location source':'Publisher'}</a></p>`);
 $('#back-picks').addEventListener('click',()=>closeModal());
 $('#detail-save').addEventListener('click',()=>{save(p.id);$('#detail-save').focus()});
}
function openPicksOverlay(){
 if($('#picks-overlay'))return;
 const source=$('.layout'),snapshot=source.cloneNode(true);snapshot.id='directory-snapshot';snapshot.setAttribute('inert','');snapshot.setAttribute('aria-hidden','true');
 snapshot.querySelectorAll('[class]').forEach(e=>{e.setAttribute('class',(e.getAttribute('class')||'').split(' ').map(c=>'preview-'+c).join(' '))});
 snapshot.querySelectorAll('[id]').forEach(e=>{if(e.id==='cards')e.classList.add('snapshot-cards');e.removeAttribute('id')});
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
function backToChefs(){const closingChef=state.chef;closeModal(true);history.pushState({},'',location.pathname);state.mode='chefs';state.chef='all';state.query=directoryQuery;state.category='All';state.saved=false;$('#search').value=directoryQuery;$('#chef-select').value='all';renderResults();$('.explore').scrollTop=directoryPanelScroll;window.scrollTo({top:directoryScroll,behavior:'instant'});$('#cards').querySelector('[data-chef="'+closingChef+'"]')?.focus({preventScroll:true});announce('Back to the chef list')}
function restoreRoute(){if(!data)return;const parts=location.hash.slice(1).split('/').map(decodeURIComponent);closeModal(true);const id=parts[0]==='chef'?parts[1]:null;if(id&&id!=='all'&&chefFor(id)){state.mode='picks';state.chef=id;$('#chef-select').value=id}else{state.mode=id==='all'?'picks':'chefs';state.chef='all';$('#chef-select').value='all'}renderResults();if(!id){state.query=directoryQuery;$('#search').value=directoryQuery;renderResults();window.scrollTo({top:directoryScroll,behavior:'instant'})}if(parts[2]==='pick'&&data.places.some(p=>p.id===parts[3]))openPlace(parts[3],true)}
window.addEventListener('popstate',restoreRoute);
function showAbout(){previousFocus=document.activeElement;showModal(`<div class="detail-top"><span class="eyebrow">THE SMALL PRINT, SIMPLIFIED</span><button id="dialog-close" class="icon-button" aria-label="Close guide information">${icon('x')}</button></div><div class="about-content"><div class="about-flower">✳</div><h2 id="dialog-title">Good taste.<br>Clear sources.</h2><p>A BC-only discovery guide to the places chefs love outside their own restaurants.</p><div class="stats"><div><b>${data.chefs.length}</b><span>profiles</span></div><div><b>${data.coverage.recommendationAnswers}</b><span>source answers</span></div><div><b>99</b><span>articles indexed</span></div></div><h3>A starting list, not the full series.</h3><p>These recommendations come from Chef’s Favourite’s official expanded <b>Mates on Crates</b> write-ups. We haven’t completed the video review, and some written picks aren’t in the videos. The signed-in archive has now been inventoried: 510 reels, including non-series posts. Spoken comments are being reviewed and added with timestamps; the complete episode review is still in progress.</p><h3>No self-promotion on the menu.</h3><p>Each chef’s own restaurants, workplaces and known affiliated venues are excluded from their picks. The restaurant under a chef’s name is their affiliation—not necessarily a business they own. “Wants to try” picks are wish-list items, not visited recommendations.</p><h3>Before you head out</h3><p>Venue addresses are matched to OpenStreetMap where available. Some chefs don’t name a branch; check the destination and opening hours. Some addresses remain unverified. Saves stay on this device.</p><p>Episode photos and recommendation sources: <a href="https://chefsfav.com" target="_blank" rel="noopener">Chef’s Favourite</a>. Independent research project, not an official Chef’s Favourite app.</p><div class="about-links"><a href="https://github.com/mrhemsing/chefs-fav/blob/main/CHEFS.md" target="_blank" rel="noopener">Full sourced list ${icon('arrow-up-right')}</a><a href="/recommendations.csv" download>Download CSV ${icon('arrow-up-right')}</a></div><p class="detail-note">Research snapshot: November 17, 2026.</p></div>`);$('#dialog-close').focus()}
init();
