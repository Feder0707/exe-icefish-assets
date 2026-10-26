/* EXE ICE FISHING · engine v1.0.2 · form&soul.exe */
(function(){
'use strict';
const W = 1024, H = 1024, PX = 4, LOOP = 12;
const cv = document.getElementById('c'), o = cv.getContext('2d');
const CFG0 = window.EXE_CFG || {};
const SIDE = (CFG0.layout || 'side') === 'side', MLEFT = CFG0.menuSide === 'left';
const CW = SIDE ? 1600 : 1024, IX = SIDE && MLEFT ? 576 : 0, PCX = SIDE ? (MLEFT ? 20 : 1044) : 0, PCW = 536;
cv.width = CW; cv.height = 1024;

// ---------------------------------------------------------------- config
const CFG = Object.assign({
  command: '!fish',
  cooldown: 20,            // s between casts per viewer
  idleLeave: 90,           // s a penguin stays after its last action
  stageTime: 45,           // s a penguin keeps its seat when others are waiting
  fishMode: 'both',        // 'command' | 'points' | 'both'
  who: 'everyone',         // 'everyone' | 'subs' | 'vips' | 'mods'
  rewardId: '',            // Twitch channel-point reward id (learned with !icefish setreward)
  coinMult: 1,
  menus: { shop:true, buy:true, dex:true, quests:true, bag:true, coins:true },
  cmds: { shop:'!shop', buy:'!buy', dex:'!dex', quests:'!quests', bag:'!bag', coins:'!coins' },
  stormSubs: true, stormBits: true, stormTips: true, minBits: 100, stormSecs: 60, raidOn: true, raidSecs: 45,
  showBoard: true, showHint: true, santaHats: true,
  cardBg: '#fff8ea', cardAccent: '#8f1c22', cardText: '#7a1418',
  volume: 0.8, sound: true,
  assetBase: 'a/',
  season: 'christmas',     // 'christmas' | 'winter'
  board: 'coins',          // leaderboard by 'coins' | 'catches'
  storeKey: 'exe-icefish-v1',
  layout: 'side',          // 'side' (menus next to the island) | 'over' (menus on top of the island)
  menuSide: 'right',       // 'right' | 'left'
  panelCooldown: 30,       // s before the same viewer can open the same menu again
  hint: 'type !fish to catch a creature',
  hintDelay: 20,           // s with nobody fishing before the hint shows
  autoHide: 0,             // s of inactivity before the widget fades out (0 = never)
}, window.EXE_CFG || {});
if (window.EXE_INITIAL_STATE && window.EXE_INITIAL_STATE.season && CFG.seasonFromChat) CFG.season = window.EXE_INITIAL_STATE.season;
CFG.menus = Object.assign({ shop:true, buy:true, dex:true, quests:true, bag:true, coins:true }, CFG.menus || {});
CFG.cmds = Object.assign({ shop:'!shop', buy:'!buy', dex:'!dex', quests:'!quests', bag:'!bag', coins:'!coins' }, CFG.cmds || {});
const AB = () => CFG.assetBase || 'a/';

// ---------------------------------------------------------------- rng
let _s = 1234567;
const rand = () => { _s |= 0; _s = _s + 0x6D2B79F5 | 0; let t = Math.imul(_s ^ _s >>> 15, 1 | _s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const setSeed = s => { _s = s; };
const pick = arr => arr[Math.floor(rand() * arr.length)];

// ---------------------------------------------------------------- assets
const I = {};
let CREATURES = [];
function load(src){ return new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src; }); }
const SEASON_ASSETS = {
  christmas: ['isla_cut','em_window','em_floor','em_lant','em_star','em_tree1','em_tree2','em_tree3'],
  winter: ['isla_winter','em_window_winter','em_lant_winter'],
  spring: ['isla_spring','em_window_spring','em_lant_spring'],
  autumn: ['isla_autumn','em_window_autumn','em_lant_autumn'] };
const READY = (async () => {
  const B = AB(), jobs = [];
  (SEASON_ASSETS[CFG.season] || SEASON_ASSETS.christmas).forEach(n => jobs.push(load(B + n + '.webp').then(im => I[n] = im)));
  const meta = await (await fetch(B + 'atlas/atlas.json')).json();
  CREATURES = await (await fetch(B + 'creatures.json')).json();
  try { JUNK = await (await fetch(B + 'junk.json')).json(); } catch(e) { JUNK = []; }
  const cut = (img, r) => { const c = document.createElement('canvas'); c.width = r[2]; c.height = r[3]; c.getContext('2d').drawImage(img, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]); return c; };
  const sheet = (name, prefix, suffix) => load(B + 'atlas/' + name + '.webp').then(img => { if (!img) return; for (const k in meta[name]) I[prefix + k + suffix] = cut(img, meta[name][k]); });
  jobs.push(sheet('cr', 'cr_', ''), sheet('cr_shiny', 'cr_', '_shiny'), sheet('cr_gold', 'cr_', '_gold'), sheet('it', 'it_', ''), sheet('peng', '', ''));
  await Promise.all(jobs);
  try { await document.fonts.load('700 20px Fredoka'); await document.fonts.load('600 20px Fredoka'); } catch(e) {}
})();
window.READY = READY;

// ---------------------------------------------------------------- rules
const RARITY = {
  common:    { w: 55,  coins: 10,  col: '#6f86a8', label: 'COMMON' },
  rare:      { w: 25,  coins: 25,  col: '#3fb8d8', label: 'RARE' },
  epic:      { w: 12,  coins: 60,  col: '#9a6ff0', label: 'EPIC' },
  legendary: { w: 4.5, coins: 150, col: '#f0b030', label: 'LEGENDARY' },
  mythic:    { w: 1,   coins: 400, col: '#ff5fa2', label: 'MYTHIC' },
  holiday:   { w: 8,   coins: 40,  col: '#d83a4a', label: 'HOLIDAY' },
  junk:      { w: 7,   coins: 2,   col: '#8a7a64', label: 'JUNK' },
};
let JUNK = [];
const JUNK_LINES = { junk_boot:'fished out... an old boot?', junk_tincan:'caught a dented tin can. yum?', junk_rustysword:'pulled out a legendary... rusty sword', junk_sock:'caught... a soggy sock. ew', junk_umbrella:'caught a broken umbrella. it was raining fish', junk_rubberduck:'caught a rubber duck! squeak squeak', junk_frozenpizza:'caught a frozen pizza. dinner!', junk_bottle:'found a love letter in a bottle!' };
const SIZES = [ { k:'tiny', w:20, m:0.7, label:'TINY' }, { k:'normal', w:50, m:1, label:null },
                { k:'chubby', w:22, m:1.4, label:'CHUBBY' }, { k:'huge', w:8, m:2.2, label:'HUGE' } ];
const VARIANT = { normal: { m: 1 }, shiny: { m: 3, p: 1/20 }, golden: { m: 10, p: 1/100 } };
function wpick(list, wf){ const tot = list.reduce((a,x)=>a+wf(x),0); let r = rand()*tot; for (const x of list){ r -= wf(x); if (r <= 0) return x; } return list[list.length-1]; }
const RORDER = ['common','rare','epic','legendary','mythic'];
function roll(force, M){
  M = M || {};
  let keys = Object.keys(RARITY).filter(k => k !== 'holiday' || CFG.season === 'christmas');
  if (M.minRare || M.golden || !JUNK.length || CFG.junk === false) keys = keys.filter(k => k !== 'junk');
  if (M.minRare) keys = keys.filter(k => k === 'holiday' || RORDER.indexOf(k) >= 1);
  const rar = force && force.rarity || wpick(keys, k => RARITY[k].w * (M.w && M.w[k] || 1));
  const pool = rar === 'junk' ? JUNK : CREATURES.filter(c => c.rarity === rar);
  const cr = force && force.id ? (CREATURES.find(c => c.id === force.id) || JUNK.find(c => c.id === force.id)) : pick(pool);
  if (cr.rarity === 'junk') return { cr, size: SIZES[1], variant: 'normal', coins: Math.round(RARITY.junk.coins * (M.coins || 1) * (CFG.coinMult || 1)) };
  const size = force && force.size ? SIZES.find(s => s.k === force.size) : wpick(SIZES, s => s.w * (M.big && (s.k==='chubby'||s.k==='huge') ? 2.5 : 1));
  let variant = force && force.variant || (M.golden ? 'golden' : rand() < VARIANT.golden.p*(M.gold||1) ? 'golden' : rand() < VARIANT.shiny.p*(M.shiny||1) ? 'shiny' : 'normal');
  const coins = Math.round(RARITY[cr.rarity].coins * size.m * VARIANT[variant].m * (M.coins || 1) * (CFG.coinMult || 1));
  return { cr, size, variant, coins };
}

// ---------------------------------------------------------------- shop items (effects last N casts; rod is permanent)
const ITEMS = [
  { id:'cocoa',         name:'Hot Cocoa',     price:200,  casts:10, desc:'+50% coins',            fx:{ coins:1.5 } },
  { id:'worm_jar',      name:'Worm Jar',      price:300,  casts:10, desc:'bites 2x faster',       fx:{ speed:2 } },
  { id:'sushi',         name:'Sushi Plate',   price:500,  casts:10, desc:'bigger catches',        fx:{ big:true } },
  { id:'mystery_gift',  name:'Mystery Gift',  price:600,  casts:0,  desc:'a random item!',        fx:{} },
  { id:'net',           name:'Fishing Net',   price:800,  casts:1,  desc:'catch 2 at once',       fx:{ double:true } },
  { id:'lantern',       name:'Lantern',       price:1000, casts:10, desc:'legendary x2',          fx:{ w:{ legendary:2, mythic:2 } } },
  { id:'clover',        name:'Lucky Clover',  price:1200, casts:10, desc:'epic & up x2',          fx:{ w:{ epic:2, legendary:2, mythic:2 } } },
  { id:'magic_lure',    name:'Magic Lure',    price:1500, casts:10, desc:'shiny x3',              fx:{ shiny:3 } },
  { id:'treasure_map',  name:'Treasure Map',  price:2500, casts:3,  desc:'rare or better',        fx:{ minRare:true } },
  { id:'golden_rod',    name:'Golden Rod',    price:3000, casts:-1, desc:'forever: rare+ x1.3',   fx:{ w:{ rare:1.3, epic:1.3, legendary:1.3, mythic:1.3 }, gold:2 } },
  { id:'golden_ticket', name:'Golden Ticket', price:9999, casts:1,  desc:'next catch is GOLDEN',  fx:{ golden:true } },
];
const ITEM = Object.fromEntries(ITEMS.map(i => [i.id, i]));
function mods(v){
  const M = { w:{} };
  (v.fx || []).forEach(e => { const f = ITEM[e.id].fx;
    if (f.w) for (const k in f.w) M.w[k] = (M.w[k]||1) * f.w[k];
    ['coins','speed','shiny','gold'].forEach(k => { if (f[k]) M[k] = (M[k]||1) * f[k]; });
    ['big','double','minRare','golden'].forEach(k => { if (f[k]) M[k] = true; }); });
  return M;
}
function useUp(v){ (v.fx || []).forEach(e => { if (e.left > 0) e.left--; }); v.fx = (v.fx || []).filter(e => e.left !== 0); }

// ---------------------------------------------------------------- quests
const QUESTS = [
  { id:'q1',  name:'First Catch',     goal:1,    stat:'catches',   reward:20 },
  { id:'q2',  name:'Getting Hooked',  goal:10,   stat:'catches',   reward:100 },
  { id:'q3',  name:'Seasoned Angler', goal:50,   stat:'catches',   reward:400 },
  { id:'q4',  name:'Master Angler',   goal:150,  stat:'catches',   reward:1500 },
  { id:'q5',  name:'Rare Find',       goal:5,    stat:'rare',      reward:150 },
  { id:'q6',  name:'Epic Hunter',     goal:3,    stat:'epic',      reward:300 },
  { id:'q7',  name:'Living Legend',   goal:1,    stat:'legendary', reward:600 },
  { id:'q8',  name:'Myth Buster',     goal:1,    stat:'mythic',    reward:1500 },
  { id:'q9',  name:'Sparkly!',        goal:1,    stat:'shiny',     reward:300 },
  { id:'q10', name:'Midas Touch',     goal:1,    stat:'golden',    reward:1000 },
  { id:'q11', name:'Collector',       goal:10,   stat:'species',   reward:200 },
  { id:'q12', name:'Curator',         goal:30,   stat:'species',   reward:800 },
  { id:'q13', name:'Completionist',   goal:79,   stat:'species',   reward:5000 },
  { id:'q14', name:'Holiday Spirit',  goal:5,    stat:'holidaySp', reward:400 },
  { id:'q15', name:'The Big One',     goal:1,    stat:'huge',      reward:100 },
  { id:'q16', name:'Teeny Tiny',      goal:1,    stat:'tiny',      reward:50 },
  { id:'q17', name:'First Purchase',  goal:1,    stat:'bought',    reward:50 },
  { id:'q18', name:'Big Spender',     goal:5000, stat:'spent',     reward:500 },
  { id:'q19', name:'Piggy Bank',      goal:2000, stat:'earned',    reward:200 },
  { id:'q21', name:'Trash Collector', goal:8,    stat:'junkSp',    reward:300 },
  { id:'q20', name:'Tycoon',          goal:20000,stat:'earned',    reward:2000 },
];
function statOf(v, k){
  if (k === 'species') return new Set(Object.keys(v.dex).filter(x => !/^junk_/.test(x)).map(x => x.replace(/_(shiny|golden)$/,''))).size;
  if (k === 'junkSp') return Object.keys(v.dex).filter(x => /^junk_/.test(x)).length;
  if (k === 'holidaySp') return new Set(Object.keys(v.dex).map(x => x.replace(/_(shiny|golden)$/,'')).filter(id => (CREATURES.find(c=>c.id===id)||{}).rarity === 'holiday')).size;
  return (v.st && v.st[k]) || 0;
}
function bump(v, k, n=1){ v.st = v.st || {}; v.st[k] = (v.st[k]||0) + n; }
function checkQuests(name){
  const v = viewer(name); v.q = v.q || {}; const done = [];
  QUESTS.forEach(q => { if (!v.q[q.id] && statOf(v, q.stat) >= q.goal) { v.q[q.id] = 1; v.coins += q.reward; bump(v,'earned',q.reward); done.push(q); } });
  if (!done.length) return;
  if (done.length > 1 && CFG.groupQuests !== false) toasts.push({ t:'quest', name, text: done.length + ' quests', reward: done.reduce((p, q) => p + q.reward, 0), group: done.map(q => q.name) });
  else done.forEach(q => toasts.push({ t:'quest', name, text: q.name, reward: q.reward }));
  sfx('quest');
}

// ---------------------------------------------------------------- state (persisted)
let S = { viewers: {} };
if (window.EXE_INITIAL_STATE && window.EXE_INITIAL_STATE.viewers) S = window.EXE_INITIAL_STATE;
else if (!window.EXE_SAVE) { try { const j = localStorage.getItem(CFG.storeKey); if (j && !/capture=1/.test(location.search)) S = JSON.parse(j); } catch(e) {} }
S.viewers = S.viewers || {};
const save = () => { if (window.EXE_SAVE) { window.EXE_SAVE(S); return; } try { localStorage.setItem(CFG.storeKey, JSON.stringify(S)); } catch(e) {} };
function viewer(name){ const v = S.viewers[name] || (S.viewers[name] = { coins: 0, catches: 0, dex: {}, fx: [], st: {}, q: {} }); v.seen = Date.now(); return v; }

// ---------------------------------------------------------------- world
const SPOTS = [ { st:[285,549], hole:[358,528], flip:false },
                { st:[560,522], hole:[490,522], flip:true  },
                { st:[436,628], hole:[503,608], flip:false } ];
const SCARVES = ['red','teal','gold','pink'];
const RING = { red:'#e0404a', teal:'#3fc0b0', gold:'#f2c94c', pink:'#ff7ab0' };
const LANT = [[815,315],[843,332],[872,343],[900,346],[907,381],[871,412],[834,432],[801,444]];
const LCOL = ['#ffd27a','#7dffb0','#ff6a5a','#9fff8a','#ffe08a','#ffb04a','#ff8ad8','#ffd27a'];
const ICI = [[70,600],[132,690],[205,830],[268,770],[372,900],[530,925],[640,800],[742,850],[806,770],[884,735],[948,560]];
const fishers = [null, null, null];      // active penguin per spot
const queue = [];                        // names waiting for a free spot
const ghosts = [];                       // viewers fishing 'off-screen' while all spots are busy
const popups = [];                       // catch cards waiting to show
let popup = null;
let T = 0;                               // game clock (s)
const fx = [];                           // one-shot effects
const toasts = [];                       // small notices (quests, coins, purchases)
const panels = [];                       // !shop / !dex / !quests / !bag cards
let panel = null;
let storm = { until: -1, kind: null, by: '' };
let lastAct = 0, quietSince = 0;   // aurora storm / raid events

function scarfOf(name){ if (window.EXE_SCARF && EXE_SCARF[name]) return EXE_SCARF[name]; let h = 0; for (const ch of name) h = (h*31 + ch.charCodeAt(0)) >>> 0; return SCARVES[h % SCARVES.length]; }
function spotOf(name){ return fishers.findIndex(f => f && f.name === name); }

function cast(name){
  let i = spotOf(name), f = i >= 0 ? fishers[i] : ghosts.find(g => g.name === name);
  if (!f) {
    i = fishers.findIndex(x => !x);
    f = { name, scarf: scarfOf(name), since: T, state: 'arrive', t0: T, last: T, nextCast: 0, pending: true };
    if (i < 0) { f.state = 'idle'; ghosts.push(f); if (!queue.includes(name)) queue.push(name); startCast(f); return; }
    fishers[i] = f; fx.push({ k: 'puff', x: SPOTS[i].st[0]+(SPOTS[i].flip?-6:6), y: SPOTS[i].st[1]-50, t0: T }); sfx('join');
    return;
  }
  if (f.state === 'idle' && T >= f.nextCast) startCast(f);
  else { if (!f.pending && f.state === 'idle' && T - (f.warned||-9) > 5) { toasts.push({ t:'nope', name, text: 'casting in ' + Math.ceil(f.nextCast - T) + 's' }); f.warned = T; } f.pending = true; }
}
function startCast(f){ const M = mods(viewer(f.name)); const sp = (M.speed||1) * (T < storm.until && storm.kind==='raid' ? 2 : 1);
  if (spotOf(f.name) >= 0) sfx('cast');
  f.state = 'wait'; f.t0 = T; f.waitDur = (2.2 + rand()*3.2) / sp; f.last = T; f.pending = false; }
const CMD = () => Object.assign({ fish: CFG.command.toLowerCase() }, Object.fromEntries(Object.entries(CFG.cmds).map(([k, v]) => [k, String(v).toLowerCase()])));
function allowed(meta){
  const r = (meta && meta.roles) || {}; if (r.broadcaster || r.mod) return true;
  if (CFG.who === 'mods') return false; if (CFG.who === 'vips') return !!r.vip;
  if (CFG.who === 'subs') return !!(r.sub || r.vip); return true; }
let learnReward = false;
const shopOpenFor = {};
function onChat(name, msg, meta){
  if (!msg && !(meta && meta.rewardId)) return; meta = meta || {};
  let m = (msg || '').trim().toLowerCase().replace(/\s+/g, ' '); const C = CMD(), r = meta.roles || {};
  // forgiving syntax: "!buy1" = "!buy 1", "!icefishstorm" / "!icefish-storm" = "!icefish storm"
  { const bm = m.match(new RegExp('^' + C.buy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s#-]*(\\d{1,2})$')); if (bm) m = C.buy + ' ' + bm[1]; }
  { const im = m.match(/^!icefish[\s_-]*(storm|raid|give|setreward|reset)(.*)$/); if (im) m = '!icefish ' + im[1] + (im[2] ? ' ' + im[2].trim() : ''); }
  const parts = m.split(' '), cmd = parts[0];
  // streamer / mod tools
  if (cmd === '!icefish' && (r.broadcaster || r.mod)) return modCmd(name, parts.slice(1));
  // channel points: reward redemption (needs "Require viewer to enter text" on the reward)
  if (meta.rewardId) {
    if (learnReward) { learnReward = false; CFG.rewardId = meta.rewardId; S.rewardId = meta.rewardId; save(); toasts.push({ t:'event', name, text: 'channel-point reward linked!' }); return; }
    const rid = CFG.rewardId || S.rewardId;
    if (rid && meta.rewardId === rid && CFG.fishMode !== 'command') { lastAct = T; return cast(name, true); }
    return;
  }
  // shortcut: right after opening the shop, a viewer can just type the number
  if (/^\d{1,2}$/.test(m) && CFG.menus.buy && shopOpenFor[name] !== undefined && T - shopOpenFor[name] < 30 && allowed(meta)) { lastAct = T; return buy(name, m); }
  if (!m.startsWith('!')) return;
  if (!allowed(meta)) return;
  lastAct = T;
  if (cmd === C.fish) { if (CFG.fishMode === 'points') return; return cast(name); }
  if (cmd === C.shop && CFG.menus.shop) { shopOpenFor[name] = T; return openPanel('shop', name); }
  if (cmd === C.dex && CFG.menus.dex) return openPanel('dex', name);
  if (cmd === C.quests && CFG.menus.quests) return openPanel('quests', name);
  if (cmd === C.bag && CFG.menus.bag) return openPanel('bag', name);
  if (cmd === C.coins && CFG.menus.coins) { toasts.push({ t:'coins', name, text: viewer(name).coins + ' coins' }); sfx('coins'); return; }
  if (cmd === C.buy && CFG.menus.buy) return buy(name, parts.slice(1).join(' '));
}
function modCmd(name, a){
  const k = a[0];
  if (k === 'setreward') { learnReward = true; toasts.push({ t:'event', name, text: 'redeem your fishing reward once to link it' }); return; }
  if (k === 'storm') return onEvent({ type: 'subscriber', name }, true);
  if (k === 'raid') return onEvent({ type: 'raid', name, amount: 10 }, true);
  if (k === 'give' && a[1] && +a[2]) { viewer(a[1].replace(/^@/,'')).coins += +a[2]; save(); toasts.push({ t:'coins', name: a[1].replace(/^@/,''), text: '+' + a[2] + ' coins' }); return; }
  if (k === 'reset' && a[1] === 'confirm') { S = { viewers: {} }; window.EXE.S = S; save(); fishers.fill(null); ghosts.length = 0; queue.length = 0; toasts.push({ t:'event', name, text: 'progress reset' }); return; }
  if (k === 'reset') { toasts.push({ t:'nope', name, text: 'type !icefish reset confirm' }); }
}
function buy(name, what){
  const v = viewer(name); if (!what) return openPanel('shop', name);
  let it = ITEMS[parseInt(what,10)-1] || ITEMS.find(i => i.id === what.replace(/\s+/g,'_') || i.name.toLowerCase() === what);
  if (!it) return;
  if (v.coins < it.price) { toasts.push({ t:'nope', name, text: 'not enough coins (' + v.coins + '/' + it.price + ')' }); sfx('nope'); return; }
  v.coins -= it.price; bump(v,'spent',it.price); bump(v,'bought');
  if (it.id === 'mystery_gift') { const pool = ITEMS.filter(i => i.id !== 'mystery_gift' && i.id !== 'golden_ticket' && i.id !== 'golden_rod'); it = pick(pool); toasts.push({ t:'gift', name, text: 'got ' + it.name + '!', item: it.id }); }
  else toasts.push({ t:'buy', name, text: it.name, item: it.id });
  if (it.casts === -1) { if (!(v.fx||[]).some(e => e.id === it.id)) v.fx.push({ id: it.id, left: -1 }); }
  else { const e = (v.fx||[]).find(e => e.id === it.id); if (e) e.left += it.casts; else v.fx.push({ id: it.id, left: it.casts }); }
  sfx('buy'); save(); checkQuests(name);
}
const panelSeen = {};
function openPanel(kind, name){ const k = kind + ':' + name;
  if (panelSeen[k] !== undefined && T - panelSeen[k] < CFG.panelCooldown) return;
  if (panels.length >= 3 || panels.some(p => p.kind === kind && p.name === name) || (panel && panel.kind === kind && panel.name === name)) return;
  panelSeen[k] = T; panels.push({ kind, name }); }
function onEvent(e, force){ // StreamElements events: subscriber, cheer, tip, raid
  if (!force) { if (e.type === 'raid' && !CFG.raidOn) return; if (e.type === 'subscriber' && !CFG.stormSubs) return;
    if (e.type === 'cheer' && (!CFG.stormBits || (e.amount||0) < CFG.minBits)) return; if (e.type === 'tip' && !CFG.stormTips) return;
    if (!['raid','subscriber','cheer','tip'].includes(e.type)) return; }
  lastAct = T; const dur = e.type === 'raid' ? (CFG.raidSecs || 45) : (CFG.stormSecs || 60);
  if (e.type === 'raid') { storm = { until: T + dur, kind: 'raid', by: e.name, amount: e.amount||0 };
    fishers.forEach(f => { if (f && f.state === 'wait') f.waitDur = Math.min(f.waitDur, T - f.t0 + 0.3); }); }
  else { const add = e.type === 'cheer' ? Math.min(dur*3, dur*(e.amount||100)/500) : dur; storm = { until: Math.min(Math.max(storm.until, T) + add, T + dur*3), kind: 'aurora', by: e.name }; }   // stacks, capped at 3x the storm length
  if (SIDE) feedAdd({ kind:'event', name: e.name, text: e.type === 'raid' ? 'RAID! fish are biting fast' : 'AURORA STORM! legendary x3' }); else toasts.push({ t:'event', name: e.name, text: e.type === 'raid' ? 'RAID! fish are biting!' : 'AURORA STORM!' }); sfx(e.type === 'raid' ? 'raid' : 'storm');
}
window.EXE = { onChat, onEvent, viewer, buy, ITEMS, QUESTS, roll, S, CFG, setSeed, force: [], forceFor: {}, CREATURES: () => CREATURES };

function drawEscapes(){ fx.forEach(e => { const a = T - e.t0;
  if (e.k === 'escape' && a < 2.6) { const sp = SPOTS[e.i], [hx, hy] = sp.hole, C = crImg(e.res);
      // 0-0.45 leap up · 0.45-1.6 hang & taunt · 1.6-2.1 dive · splash
      let x = hx, y, rot = 0, sc = 0.9;
      if (a < 0.45) { const u = a/0.45, e2 = 1 - (1-u)*(1-u); y = hy - 10 - e2*240; x = hx + (470 - hx)*0.5*e2; rot = (1-u)*0.6; }
      else if (a < 1.6) { const u = (a - 0.45)/1.15; y = hy - 250 + Math.sin(a*9)*6; rot = Math.sin(a*14)*0.22; x = hx + (470 - hx)*0.5 + Math.sin(a*5)*14; sc = 0.9 + 0.06*Math.sin(a*18); }
      else if (a < 2.1) { const u = (a - 1.6)/0.5; y = hy - 250 + u*u*250; x = hx + (470 - hx)*0.5*(1 - u); rot = u*2.6; sc = 0.9 - u*0.4; }
      if (C && a < 2.1) { const s = sc * 210/Math.max(C.width, C.height);
        o.save(); o.globalCompositeOperation = 'lighter'; glow(x, y, 150, '#ffffff', 0.22); o.restore();
        o.save(); o.translate(x, y); o.rotate(rot); if (x > hx + 0 && sp.flip) o.scale(-1, 1); o.imageSmoothingEnabled = false;
        o.shadowColor = 'rgba(10,8,30,0.45)'; o.shadowBlur = 14; o.shadowOffsetY = 10;
        o.drawImage(C, -C.width*s/2, -C.height*s/2, C.width*s, C.height*s); o.shadowColor = 'transparent';
        if (a > 0.5 && a < 1.55) { // raspberry tongue, wobbling
          const tl = 24 + 8*Math.sin(a*30), tx0 = C.width*s*0.46, ty0 = C.height*s*0.12;
          o.fillStyle = '#ff6f8f'; o.beginPath(); o.ellipse(tx0 + tl*0.5, ty0, tl*0.7, 13, 0.2, 0, 7); o.fill(); o.lineWidth = 3; o.strokeStyle = '#7a1430'; o.stroke();
          o.strokeStyle = '#c83a5a'; o.lineWidth = 2; o.beginPath(); o.moveTo(tx0 + 4, ty0); o.lineTo(tx0 + tl, ty0 + 1); o.stroke(); }
        o.restore(); }
      // taunt bubble next to the creature
      if (a > 0.5 && a < 1.65) { const line = (fishers[e.i] && fishers[e.i].escLine) || 'nyeh!', k = back(clamp((a - 0.5)/0.25, 0, 1));
        o.save(); o.translate(x + (x > 512 ? -150 : 150), y - 100); o.scale(k, k); o.rotate(x > 512 ? 0.06 : -0.06); o.font = '700 36px Fredoka'; const bw = o.measureText(line).width + 50;
        o.fillStyle = '#fff8ea'; o.beginPath(); o.roundRect(-bw/2, -34, bw, 68, 34); o.fill(); o.lineWidth = 6; o.strokeStyle = '#ff6f8f'; o.stroke();
        o.fillStyle = '#4a1418'; o.textAlign = 'center'; o.textBaseline = 'middle'; o.fillText(line, 0, 2); o.restore(); }
      // tiny sparkle of mischief + splash ring + droplets
      if (a > 0.45 && a < 1.6) for (let q = 0; q < 3; q++){ const ph = (a*2 + q*0.33) % 1; star(x + Math.cos(q*2.1 + a*3)*80, y + Math.sin(q*2.1 + a*3)*60, 6 + ph*8, '#fff3c0'); }
      const sp0 = a < 0.4 ? a/0.4 : a > 2.05 ? (a - 2.05)/0.5 : -1;
      if (sp0 >= 0 && sp0 <= 1) { for (let q = 0; q < 12; q++){ const ang = -Math.PI*(0.05 + 0.9*q/11), r = 14 + sp0*110; block(hx + Math.cos(ang)*r, hy - 6 + Math.sin(ang)*r*0.7 + sp0*sp0*70, '#e8f8ff', 1 - sp0); }
        for (let q = 0; q < 6.28; q += 0.3) block(hx + Math.cos(q)*(20 + sp0*60), hy + Math.sin(q)*(8 + sp0*24), '#bff0ff', 0.8*(1 - sp0)); } }
  }); }
function escapeOn(){ return fx.some(e => e.k === 'escape' && T - e.t0 < 2.6); }
const ESCAPE_LINES = ['nyeh! too slow!', 'catch me if you can~', 'not today, penguin!', 'thanks for the snack!', 'bye bye!', 'you wish!'];
const timers = [];
function later(sec, fn){ timers.push({ at: T + sec, fn }); }
function announce(name, res, i){
  const low = res.variant === 'normal' && (res.cr.rarity === 'common' || res.cr.rarity === 'rare');
  const small = (low && (!res.isNew || popups.length >= 4) && popups.length >= 2) || (popups.length >= 6 && !['legendary','mythic'].includes(res.cr.rarity) && res.variant !== 'golden');
  const big = ['legendary','mythic'].includes(res.cr.rarity) || res.variant === 'golden';
  if (big) { const at = popups.findIndex(p => !(['legendary','mythic'].includes(p.res.cr.rarity) || p.res.variant === 'golden')); if (at >= 0) { if (SIDE) feedAdd({ kind:'catch', name, res, text: catchLine(res) + ' +' + res.coins }); popups.splice(at, 0, { name, res, i }); return; } }
  if (SIDE) feedAdd({ kind:'catch', name, res, text: catchLine(res) + ' +' + res.coins });
  if (small) { if (!SIDE) toasts.push({ t:'catch', name, text: res.cr.name + ' +' + res.coins }); }   // busy chat: no hero, just the note
  else popups.push({ name, res, i });
}
function step(dt){
  T += dt;
  for (let k = timers.length - 1; k >= 0; k--) if (timers[k].at <= T) { const f = timers[k].fn; timers.splice(k, 1); f(); }
  const tick = (f, i) => {
    if (!f) return;
    const a = T - f.t0;
    if (f.state === 'arrive' && a > 0.45) { f.state = 'idle'; f.t0 = T; if (f.pending) startCast(f); }
    else if (f.state === 'wait' && a > f.waitDur) { f.state = 'bite'; f.t0 = T; if (i >= 0) sfx('bite');
      f.willEscape = i >= 0 && ((window.EXE.escapeFor || {})[f.name] > 0 || (!(window.EXE.forceFor[f.name] || []).length && rand() < (CFG.escapeChance ?? 0.05)));
      if (f.willEscape && (window.EXE.escapeFor || {})[f.name] > 0) window.EXE.escapeFor[f.name]--; }
    else if (f.state === 'bite' && a > 0.9 && f.willEscape && ((popup || popups.length || escapeOn()) && a < 7)) { /* keep tugging: the escape waits for an empty stage */ }
    else if (f.state === 'bite' && a > 0.9 && f.willEscape) {
      f.willEscape = false; f.state = 'reel'; f.t0 = T; f.escaped = true; const ghost = roll({ rarity: pick(['common','rare','epic']) }, {}); ghost.coins = 0;
      f.res = ghost; f.escLine = pick(ESCAPE_LINES).replace('{c}', ghost.cr.name); sfx('escape');
      fx.push({ k: 'escape', i, res: ghost, t0: T, name: f.name });
      if (SIDE) feedAdd({ kind:'note', name: f.name, res: ghost, text: f.escLine });
    }
    else if (f.state === 'bite' && a > 0.9) {
      f.state = 'reel'; f.t0 = T; f.escaped = false;
      const v = viewer(f.name); const M = mods(v);
      if (T < storm.until && storm.kind === 'aurora') { M.w.legendary = (M.w.legendary||1)*3; M.w.mythic = (M.w.mythic||1)*3; M.shiny = (M.shiny||1)*2; }
      const ff = window.EXE.forceFor[f.name];
      const n = M.double ? 2 : 1; let first = null;
      for (let k = 0; k < n; k++) {
        const res = roll((ff && ff.shift()) || window.EXE.force.shift(), M);
        v.coins += res.coins; v.catches++; bump(v,'catches'); bump(v,'earned',res.coins); bump(v,res.cr.rarity);
        if (res.variant !== 'normal') bump(v,res.variant); if (res.size.k === 'huge' || res.size.k === 'tiny') bump(v,res.size.k);
        const key = res.cr.id + (res.variant === 'normal' ? '' : '_' + res.variant);
        res.isNew = !v.dex[key]; v.dex[key] = (v.dex[key] || 0) + 1;
        S.chan = S.chan || {}; res.chanFirst = !S.chan[key] && !(window.EXE_DEMO_NOFIRST); S.chan[key] = 1;
        res.found = new Set(Object.keys(v.dex).filter(x => !/^junk_/.test(x)).map(x => x.replace(/_(shiny|golden)$/,''))).size;
        if (!first) first = res; else announce(f.name, res, i);
      }
      useUp(v); save(); checkQuests(f.name);
      f.res = first; if (i >= 0) sfx('reel'); later(i >= 0 ? 0.55 : 0, () => sfx('catch', first));
      if (i >= 0) fx.push({ k: 'leap', i, res: first, t0: T });
    }
    else if (f.state === 'reel' && f.escaped) { if (a > 2.3) { f.state = 'cheer'; f.t0 = T; f.sad = true; } }
    else if (f.state === 'reel' && a > 0.55) { f.state = 'cheer'; f.t0 = T; f.sad = false; if (i >= 0) sfx('cheer'); announce(f.name, f.res, i); }
    else if (f.state === 'cheer' && a > (f.sad ? 0.8 : ['common','rare'].includes(f.res.cr.rarity) && f.res.variant === 'normal' ? 1.0 : 1.8)) { f.sad = false;
      f.state = 'idle'; f.t0 = T; f.last = T; f.nextCast = T + (window.EXE_DEMO ? (CFG.demoCooldown ?? 1.5) : CFG.cooldown);
      if (i >= 0 && queue.length && T - f.since > CFG.stageTime) {   // share the stage: step back so someone waiting can sit down
        fx.push({ k:'puff', x: SPOTS[i].st[0], y: SPOTS[i].st[1]-50, t0: T }); fishers[i] = null; f.since = T; ghosts.push(f); queue.push(f.name); return; }
      if (f.pending && T >= f.nextCast) startCast(f);
    }
    else if (f.state === 'idle') {
      if (f.pending && T >= f.nextCast) startCast(f);
      else if (T - f.last > CFG.idleLeave || (i >= 0 && queue.length && T - f.last > 20)) { if (i >= 0) { fx.push({ k:'puff', x: SPOTS[i].st[0], y: SPOTS[i].st[1]-50, t0: T }); fishers[i] = null; } else { ghosts.splice(ghosts.indexOf(f), 1); const q = queue.indexOf(f.name); if (q >= 0) queue.splice(q, 1); } }
    }
  };
  fishers.forEach((f, i) => tick(f, i)); ghosts.slice().forEach(g => tick(g, -1));
  // a spot is free: the oldest waiting viewer walks in, keeping whatever they were doing
  for (let i = 0; i < fishers.length; i++) if (!fishers[i] && queue.length) { const n = queue.shift(); const g = ghosts.find(x => x.name === n);
    if (g) { ghosts.splice(ghosts.indexOf(g), 1); g.since = T; fishers[i] = g; fx.push({ k: 'puff', x: SPOTS[i].st[0], y: SPOTS[i].st[1]-50, t0: T }); } }
  if (!panel && panels.length) { panel = panels.shift(); panel.t0 = T; sfx('menu'); panel.dur = panels.length ? 5 : 7; }
  if (panel && T - panel.t0 > panel.dur) panel = null;
  toasts.forEach(t => { if (t.t0 === undefined) t.t0 = T; }); for (let k = toasts.length - 1; k >= 0; k--) if (T - toasts[k].t0 > 3.2) toasts.splice(k, 1);
  if (!popup && popups.length && !escapeOn()) { popup = popups.shift(); popup.t0 = T; if (popup.res.isNew && !popup.escape) later(0.7, () => sfx('new')); popup.dur = popup.escape ? 2.2 : (['legendary','mythic'].includes(popup.res.cr.rarity) || popup.res.variant !== 'normal') ? 3.4 : (popups.length ? 2.0 : 2.8); }
  if (popup && T - popup.t0 > popup.dur) popup = null;
  for (let k = fx.length - 1; k >= 0; k--) if (T - fx[k].t0 > 2.5) fx.splice(k, 1);
}

// ---------------------------------------------------------------- drawing helpers
const hex = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
const rgba = (h,a) => { const [r,g,b] = hex(h); return `rgba(${r},${g},${b},${a})`; };
const clamp = (x,a,b) => Math.max(a, Math.min(b, x));
const back = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3*Math.pow(x-1,3) + c1*Math.pow(x-1,2); };
const G = {};
function graded(n, tint){ const k = n + tint; if (G[k]) return G[k]; const im = I[n]; if (!im) return null; const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d');
  x.drawImage(im,0,0); x.globalCompositeOperation = 'multiply'; x.fillStyle = tint; x.fillRect(0,0,c.width,c.height); x.globalCompositeOperation = 'destination-in'; x.drawImage(im,0,0); return G[k] = c; }
function glow(x,y,r,col,a,sy=1){ o.save(); o.translate(x,y); o.scale(1,sy); const g = o.createRadialGradient(0,0,0,0,0,r);
  g.addColorStop(0, rgba(col,a)); g.addColorStop(0.35, rgba(col,a*0.45)); g.addColorStop(1, rgba(col,0)); o.fillStyle = g; o.fillRect(-r,-r,2*r,2*r); o.restore(); }
function block(x,y,col,a=1){ o.globalAlpha = a; o.fillStyle = col; o.fillRect(Math.round(x/PX)*PX, Math.round(y/PX)*PX, PX, PX); o.globalAlpha = 1; }
function star(x,y,r,col){ o.fillStyle = col; o.beginPath(); o.moveTo(x,y-r); o.lineTo(x+r*0.25,y-r*0.25); o.lineTo(x+r,y); o.lineTo(x+r*0.25,y+r*0.25); o.lineTo(x,y+r); o.lineTo(x-r*0.25,y+r*0.25); o.lineTo(x-r,y); o.lineTo(x-r*0.25,y-r*0.25); o.closePath(); o.fill(); }
let seed2 = 3; const r2 = () => (seed2 = (seed2*16807) % 2147483647) / 2147483647;
const snow = []; for (let i = 0; i < 90; i++) snow.push({ x: Math.floor(r2()*W/PX)*PX, y0: r2()*H, near: i%3===0, ph: r2()*6 });

function aurora(t, boost){ o.save(); o.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++){ const col = ['#5fffb0','#4fd8ff','#b07dff'][k];
    for (let x = 0; x < W; x += 8){ const u = x/W; const y = 110 + k*34 + Math.sin(u*5+t*0.5+k)*36 + Math.sin(u*11-t*0.8)*10; const h = 60 + 40*Math.sin(u*7+t*0.7+k);
      const a = (0.16 + boost*0.25) * Math.sin(Math.PI*u) * (0.7 + 0.3*Math.sin(t*0.5+k+u*3)); const g = o.createLinearGradient(0,y-h,0,y+16);
      g.addColorStop(0, rgba(col,0)); g.addColorStop(0.85, rgba(col,a)); g.addColorStop(1, rgba(col,0)); o.fillStyle = g; o.fillRect(x, y-h, 8, h+16); } }
  o.restore(); }

// pose per state
function poseOf(f){ const a = T - f.t0; const blink = ((T + f.name.length*0.7) % 4.1) < 0.15;
  switch (f.state) {
    case 'arrive': return { p: 0, dy: -Math.round((1 - clamp(a/0.45,0,1))*30), sc: back(clamp(a/0.45,0,1)) };
    case 'bite':   return { p: blink?1:0, jig: Math.floor(a*12)%2, bang: true };
    case 'reel':   return f.escaped ? { p: a < 0.5 ? 2 : 1, dy: a > 0.5 ? 4 : 0, tilt: a > 0.5 ? -0.32*Math.min(1, (a - 0.5)/0.2) : 0, sad: a > 0.5, noo: a > 1.5 } : { p: 2 };
    case 'cheer':  return f.sad ? { p: 1, dy: 2, sad: true } : { p: 3, dy: -Math.abs(Math.round(Math.sin(a*9)*3))*2 };
    default:       return { p: blink?1:0 };
  } }
const TIPS = { 0:[87,54], 1:[87,54], 2:[70,0] }, SCX = 33;
const HEAD = { 0:[35,25], 1:[35,25], 2:[27,21], 3:[37,21] };
const HAT = [
'.KK...........',
'KWWK..........',
'KWWKKK........',
'.KKRRRK.......',
'..KRRRRKK.....',
'..KrRRRRRK....',
'.KrrRRRRRRK...',
'.KrrRRRRRRRK..',
'KWWWWWWWWWWWWK',
'KWWWWWWWWWWWWK',
'.KKKKKKKKKKKK.'];
function drawFisher(f, i){
  const sp = SPOTS[i], P = poseOf(f), img = graded('p'+P.p+'_'+f.scarf, '#b4bff0'); if (!img) return null;
  const [sx, sy] = sp.st, dy = P.dy || 0, sc = P.sc || 1;
  o.save(); o.translate(sx, sy + dy); if (P.tilt) o.rotate(sp.flip ? -P.tilt : P.tilt); if (sp.flip) o.scale(-1, 1); o.scale(sc, sc); o.imageSmoothingEnabled = false;
  o.drawImage(img, -SCX + (P.jig||0)*2, -img.height);
  if (CFG.season === 'christmas' && CFG.santaHats !== false) { const hc = HEAD[P.p], q = 3, HG = HAT;
    const hx0 = -SCX + (P.jig||0)*2 + hc[0] - 7*q, hy0 = -img.height + hc[1] + 9 - HG.length*q;
    HG.forEach((row, j) => { for (let i = 0; i < row.length; i++){ const ch = row[i]; if (ch === '.') continue;
      o.fillStyle = ch === 'R' ? '#b8304a' : ch === 'r' ? '#84203a' : ch === 'K' ? '#1c1430' : '#d6dcf4'; o.fillRect(hx0 + i*q, hy0 + j*q, q, q); } }); }
  o.restore();
  if (TIPS[P.p] !== undefined && f.state !== 'arrive') {
    const tip = TIPS[P.p], tx = sx + (sp.flip ? -(tip[0]-SCX) : (tip[0]-SCX)), ty = sy + dy + tip[1] - img.height + (P.jig||0)*2;
    const [hx, hy] = sp.hole; const inWater = f.state === 'wait' || f.state === 'bite';
    const ex = hx + (sp.flip ? 8 : -8), ey = hy + (f.state === 'bite' ? 6 : inWater ? Math.round(Math.sin(T*2+i)*2) : -30);
    for (let k = 0; k <= 40; k++){ const u = k/40; const x = tx + (ex-tx)*u, y = ty + (ey-ty)*u + Math.sin(Math.PI*u)*(P.p===2?0:6);
      o.fillStyle = 'rgba(225,240,255,0.85)'; o.fillRect(Math.round(x/2)*2, Math.round(y/2)*2, 2, 2); }
    if (f.state === 'wait' && ((T - f.t0) % 1.6) < 0.25) { for (let a = 0; a < 6.28; a += 0.6) block(hx + Math.cos(a)*14, hy + Math.sin(a)*6, '#e8f8ff', 0.6); }
  }
  if (f.state === 'idle' && !f.pending && T - f.t0 > (CFG.dozeAfter ?? 12)) { // dozing off
    const zx = sx + (sp.flip ? -26 : 26), zy = sy + dy - 150, ph = (T*0.6) % 1;
    [0, 0.5].forEach(off => { const p = (ph + off) % 1, al = Math.sin(Math.PI*p); o.save(); o.globalAlpha = al; o.fillStyle = '#e8f0ff'; o.strokeStyle = '#1c1430'; o.lineWidth = 4;
      o.font = '700 ' + Math.round(22 + p*10) + 'px Fredoka'; o.textAlign = 'center'; o.strokeText('z', zx + p*18 + off*10, zy - p*40); o.fillText('z', zx + p*18 + off*10, zy - p*40); o.restore(); }); }
  if (P.noo) { const k = back(clamp((T - f.t0 - 1.5)/0.2, 0, 1)), nx = sx + (sp.flip ? -10 : 10), ny = sy + dy - 168; o.save(); o.translate(nx, ny); o.scale(k, k); o.rotate(-0.06);
    o.font = '700 34px Fredoka'; o.textAlign = 'center'; o.textBaseline = 'middle'; o.lineWidth = 8; o.strokeStyle = '#1c1430'; o.strokeText('NOOO!', 0, 0); o.fillStyle = '#ffe08a'; o.fillText('NOOO!', 0, 0); o.restore(); }
  if (P.sad) { const tx = sx + (sp.flip ? -14 : 14), ty = sy + dy - 150; o.fillStyle = '#7fc8f0'; o.beginPath(); o.moveTo(tx, ty - 14); o.quadraticCurveTo(tx + 10, ty + 2, tx, ty + 7); o.quadraticCurveTo(tx - 10, ty + 2, tx, ty - 14); o.fill(); }
  if (P.bang) { // pixel "!"
    const bx = sx + (sp.flip ? -4 : 4), by = sy + dy - 158 - (Math.floor((T-f.t0)*8)%2)*4;
    o.fillStyle = '#1c1224'; o.fillRect(bx-6, by-4, 16, 34); o.fillRect(bx-6, by+34, 16, 14);
    o.fillStyle = '#ffe08a'; o.fillRect(bx-2, by, 8, 24); o.fillRect(bx-2, by+38, 8, 8);
  }
  return { x: sx + (sp.flip ? -12 : 12), y: sy + dy - (CFG.season === 'christmas' && CFG.santaHats !== false ? 150 : 132) };
}
function pill(x, y, text, col){ o.font = '700 22px Fredoka'; const w = o.measureText(text).width + 24, h = 30;
  o.fillStyle = 'rgba(14,20,44,0.86)'; o.beginPath(); o.roundRect(x-w/2, y-h, w, h, 15); o.fill(); o.lineWidth = 3; o.strokeStyle = col; o.stroke();
  o.fillStyle = '#fff8ea'; o.textAlign = 'center'; o.textBaseline = 'middle'; o.fillText(text, x, y-h/2+1); }

function crImg(res){ return I['cr_' + res.cr.id + (res.variant === 'shiny' ? '_shiny' : res.variant === 'golden' ? '_gold' : '')]; }

// ---- hero catch: the creature is the star (big over the island), sentence bubble in the sky, reward plank on the cliff
const HERO = { x: 470, y: 420, bubbleY: 92, plankY: 772 };
function article(w){ return /^[aeiou]/i.test(w) ? 'an' : 'a'; }
function catchLine(R){ if (R.cr.rarity === 'junk') return JUNK_LINES[R.cr.id] || ('caught ' + R.cr.name + '?'); const parts = []; if (R.size.k !== 'normal') parts.push(R.size.k); if (R.variant === 'shiny') parts.push('SHINY'); if (R.variant === 'golden') parts.push('GOLDEN');
  if (['epic','legendary','mythic'].includes(R.cr.rarity) && R.variant === 'normal') parts.push(RARITY[R.cr.rarity].label.charAt(0) + RARITY[R.cr.rarity].label.slice(1).toLowerCase());
  const w = parts.concat([R.cr.name]); return 'caught ' + article(w[0]) + ' ' + w.join(' ') + '!'; }
function drawEscape(){
  const a = T - popup.t0, out = clamp((popup.dur - a)/0.35, 0, 1), k = back(clamp(a/0.35, 0, 1));
  o.save(); o.globalAlpha = out; o.textAlign = 'center'; o.textBaseline = 'middle';
  o.font = '700 36px Fredoka'; const line = popup.escape, bw = o.measureText(line).width + 70, bh = 100, bx = HERO.x - bw/2, by = HERO.bubbleY + (1-k)*-30;
  o.fillStyle = CFG.cardBg; o.beginPath(); o.roundRect(bx, by, bw, bh, 46); o.fill(); o.lineWidth = 6; o.strokeStyle = '#6f86a8'; o.stroke();
  o.fillStyle = RING[scarfOf(popup.name)] || '#d6a028'; o.font = '600 28px Fredoka'; o.fillText(popup.name, HERO.x, by + 30);
  o.fillStyle = CFG.cardText; o.font = '700 36px Fredoka'; o.fillText(line, HERO.x, by + 68);
  // sweat drop
  const dx = bx + bw - 10, dy = by + 6 + Math.abs(Math.sin(a*3))*6; o.fillStyle = '#7fc8f0'; o.beginPath(); o.moveTo(dx, dy - 16); o.quadraticCurveTo(dx + 12, dy + 2, dx, dy + 8); o.quadraticCurveTo(dx - 12, dy + 2, dx, dy - 16); o.fill();
  o.restore();
}
function drawPopup(){
  if (!popup) return;
  if (popup.escape) return drawEscape();
  const a = T - popup.t0, R = popup.res, rc = RARITY[R.cr.rarity], col = R.variant === 'golden' ? '#ffd36a' : rc.col;
  const k = clamp(a/0.35, 0, 1), out = clamp((popup.dur - a)/0.35, 0, 1), pop = back(k);
  const big = ['legendary','mythic'].includes(R.cr.rarity) || R.variant !== 'normal';
  o.save(); o.globalAlpha = out;
  // rays + glow behind the creature
  o.save(); o.translate(HERO.x, HERO.y); o.globalCompositeOperation = 'lighter'; o.rotate(a*0.35);
  const nR = big ? 16 : 10, len = (big ? 380 : 300) * pop;
  for (let i = 0; i < nR; i++){ o.rotate(Math.PI*2/nR); const g = o.createLinearGradient(0,0,0,-len); g.addColorStop(0, rgba(col, big ? 0.42 : 0.28)); g.addColorStop(1, rgba(col, 0));
    o.fillStyle = g; o.beginPath(); o.moveTo(-14,0); o.lineTo(14,0); o.lineTo(46,-len); o.lineTo(-46,-len); o.fill(); }
  o.restore();
  o.save(); o.globalCompositeOperation = 'lighter'; glow(HERO.x, HERO.y, 190*pop, '#ffffff', 0.35); o.restore();
  // creature (pixel-crisp), gentle bob
  const C = crImg(R); if (C) { const target = (R.size.k==='tiny'?190:R.size.k==='huge'?300:R.size.k==='chubby'?275:250) * pop; const s = target/Math.max(C.width, C.height);
    o.save(); o.imageSmoothingEnabled = false; o.shadowColor = 'rgba(10,8,30,0.45)'; o.shadowBlur = 18; o.shadowOffsetY = 12;
    o.drawImage(C, HERO.x - C.width*s/2, HERO.y - C.height*s/2 + Math.round(Math.sin(a*4)*4), C.width*s, C.height*s); o.restore(); }
  for (let i = 0; i < (big ? 8 : 5); i++){ const ph = ((a*1.8 + i*0.29) % 1); if (ph < 0.65){ const ang = i*0.83 + 0.4, r = 150 + (i%3)*24; star(HERO.x + Math.cos(ang)*r, HERO.y + Math.sin(ang)*r*0.8, 7 + ph*14, R.variant==='golden'?'#ffd36a':'#fff3c0'); } }
  // sentence bubble (sky)
  const line = catchLine(R); o.textAlign = 'center'; o.textBaseline = 'middle';
  o.font = '700 40px Fredoka'; let fs = 40; while (o.measureText(line).width > 760 && fs > 26) { fs -= 2; o.font = '700 ' + fs + 'px Fredoka'; }
  const bw = Math.max(o.measureText(line).width, 200) + 70, bh = 108, bx = HERO.x - bw/2, by = HERO.bubbleY + (1 - pop)*-30;
  o.save(); o.shadowColor = 'rgba(0,0,0,0.35)'; o.shadowBlur = 20; o.shadowOffsetY = 8;
  o.fillStyle = CFG.cardBg; o.beginPath(); o.roundRect(bx, by, bw, bh, 50); o.fill(); o.restore();
  o.fillStyle = CFG.cardBg; o.beginPath(); o.moveTo(HERO.x - 20, by + bh - 3); o.lineTo(HERO.x + 20, by + bh - 3); o.lineTo(HERO.x, by + bh + 28); o.closePath(); o.fill();
  o.lineWidth = 6; o.strokeStyle = CFG.cardAccent; o.beginPath(); o.roundRect(bx, by, bw, bh, 50); o.stroke();
  o.fillStyle = CFG.cardBg; o.fillRect(HERO.x - 17, by + bh - 6, 34, 8);
  o.beginPath(); o.moveTo(HERO.x - 22, by + bh); o.lineTo(HERO.x, by + bh + 28); o.lineTo(HERO.x + 22, by + bh); o.stroke();
  o.fillStyle = RING[scarfOf(popup.name)] || '#d6a028'; o.font = '600 30px Fredoka'; o.fillText(popup.name, HERO.x, by + 32);
  o.fillStyle = CFG.cardText; o.font = '700 ' + fs + 'px Fredoka'; o.fillText(line, HERO.x, by + 72);
  if (R.isNew) { o.save(); o.translate(bx + bw - 22, by - 4); o.rotate(0.24); o.fillStyle = '#d83a4a'; o.beginPath(); o.roundRect(-46, -19, 92, 38, 12); o.fill(); o.fillStyle = '#fff8ea'; o.font = '700 25px Fredoka'; o.fillText('NEW!', 0, 1); o.restore(); }
  // reward plank (cliff)
  const chips = [[rc.label, rc.col, '#fff8ea']]; if (R.variant !== 'normal') chips.push([R.variant === 'golden' ? 'GOLDEN' : 'SHINY', R.variant === 'golden' ? '#e0a92a' : '#b98aff', '#fff8ea']);
  if (R.size.label) chips.push([R.size.label, '#f2a1a8', '#7a1418']);
  o.font = '700 24px Fredoka'; const cw = chips.map(c => o.measureText(c[0]).width + 40); const coinTxt = '+' + R.coins; o.font = '700 40px Fredoka'; const coinW = o.measureText(coinTxt).width + 52;
  o.font = '600 22px Fredoka'; const dexTxt = (R.found || 0) + '/' + CREATURES.length; const dexW = o.measureText(dexTxt).width + 30;
  const pw = 40 + coinW + cw.reduce((p, c) => p + c + 12, 0) + dexW, ph = 74, px = HERO.x - pw/2, py = HERO.plankY + (1 - pop)*30;
  o.save(); o.shadowColor = 'rgba(0,0,0,0.4)'; o.shadowBlur = 16; o.shadowOffsetY = 8; o.fillStyle = '#7a4e30'; o.beginPath(); o.roundRect(px, py, pw, ph, 20); o.fill(); o.restore();
  o.lineWidth = 5; o.strokeStyle = '#46281a'; o.beginPath(); o.roundRect(px, py, pw, ph, 20); o.stroke();
  o.strokeStyle = 'rgba(160,110,70,0.6)'; o.lineWidth = 2; for (let k2 = 1; k2 < 4; k2++){ o.beginPath(); o.moveTo(px + 14, py + 18*k2); o.lineTo(px + pw - 14, py + 18*k2); o.stroke(); }
  let x = px + 26; o.textAlign = 'left'; o.font = '700 40px Fredoka'; o.fillStyle = '#ffeca0'; o.fillText(coinTxt, x, py + ph/2 + 2); x += coinW - 40;
  o.fillStyle = '#e0a92a'; o.beginPath(); o.arc(x + 12, py + ph/2, 14, 0, 7); o.fill(); o.fillStyle = '#ffe08a'; o.beginPath(); o.arc(x + 9, py + ph/2 - 3, 7, 0, 7); o.fill(); x += 40;
  chips.forEach((c, i) => { o.fillStyle = c[1]; o.beginPath(); o.roundRect(x, py + 16, cw[i], 42, 21); o.fill(); o.fillStyle = c[2]; o.font = '700 24px Fredoka'; o.textAlign = 'center'; o.fillText(c[0], x + cw[i]/2, py + 38); x += cw[i] + 12; });
  o.textAlign = 'left'; o.fillStyle = '#ffeccc'; o.font = '600 22px Fredoka'; o.fillText(dexTxt, x + 6, py + 38);
  if (R.chanFirst && (['epic','legendary','mythic'].includes(R.cr.rarity) || R.variant !== 'normal')) { o.textAlign = 'center'; o.font = '700 21px Fredoka'; const t = 'FIRST IN THIS CHANNEL!', tw = o.measureText(t).width + 34;
    o.fillStyle = '#2f7a5a'; o.beginPath(); o.roundRect(HERO.x - tw/2, py + ph + 6, tw, 36, 18); o.fill(); o.lineWidth = 3; o.strokeStyle = '#e6c27c'; o.stroke(); o.fillStyle = '#fff8ea'; o.fillText(t, HERO.x, py + ph + 25); }
  o.restore();
}
// ---- side column: how to play, leaderboard, latest catches (menus open on top of it)
const feed = [];
function feedAdd(e){ feed.unshift(Object.assign({ t0: T }, e)); if (feed.length > 6) feed.pop(); }
const TABCOL = { fish:'#3fb8a8', dex:'#9a6ff0', shop:'#e0a92a', bag:'#d8643a', quests:'#e0404a', coins:'#c8901c' };
function drawColumn(){
  const x = PCX, w = PCW; let y = 26; const vis = panel ? clamp(1 - (T - panel.t0)/0.25, 0, 1) * 0 + (panel ? 0 : 1) : 1;
  if (!vis) return;
  o.save(); o.textBaseline = 'middle';
  const head = (t, yy) => { o.font = '700 26px Fredoka'; o.textAlign = 'left'; o.lineJoin = 'round'; o.lineWidth = 6; o.strokeStyle = 'rgba(14,18,36,0.9)'; o.strokeText(t, x + 6, yy); o.fillStyle = '#f3e2c2'; o.fillText(t, x + 6, yy); };
  head('PLAY IN CHAT', y + 14); y += 40;
  const tabs = [['fish', CFG.command]]; ['dex','shop','bag','quests','coins'].forEach(k => { if (CFG.menus[k]) tabs.push([k, CFG.cmds[k]]); });
  tabs.forEach((t, i) => { const tx = x + (i%2)*(w/2), ty = y + Math.floor(i/2)*58; o.font = '700 28px Fredoka'; const tw = Math.min(w/2 - 14, o.measureText(t[1]).width + 44);
    o.fillStyle = TABCOL[t[0]]; o.beginPath(); o.roundRect(tx, ty, tw, 48, 16); o.fill(); o.fillStyle = 'rgba(0,0,0,0.22)'; o.beginPath(); o.roundRect(tx, ty + 40, tw, 8, [0,0,16,16]); o.fill();
    o.fillStyle = '#fff8ea'; o.fillText(t[1], tx + 22, ty + 22); });
  y += Math.ceil(tabs.length/2)*58 + 18;
  if (CFG.showBoard) { const rows = Object.entries(S.viewers).filter(e => e[1].catches > 0).sort((a,b) => (CFG.board === 'coins' ? b[1].coins - a[1].coins : b[1].catches - a[1].catches)).slice(0, 5);
    if (rows.length) { const h = 58 + rows.length*38; o.fillStyle = CFG.cardBg; o.beginPath(); o.roundRect(x, y, w, h, 24); o.fill(); o.lineWidth = 5; o.strokeStyle = CFG.cardAccent; o.stroke();
      o.fillStyle = CFG.cardAccent; o.font = '700 24px Fredoka'; o.fillText('TOP FISHERS', x + 22, y + 30);
      rows.forEach(([n, v], k) => { const yy = y + 66 + k*38; o.fillStyle = ['#e0a92a','#a8b4c8','#c8845a','#7a6a8a','#7a6a8a'][k]; o.beginPath(); o.arc(x + 36, yy, 14, 0, 7); o.fill();
        o.fillStyle = '#fff8ea'; o.font = '700 17px Fredoka'; o.textAlign = 'center'; o.fillText(k+1, x + 36, yy + 1);
        o.fillStyle = CFG.cardText; o.textAlign = 'left'; o.font = '600 22px Fredoka'; o.fillText(n.length > 16 ? n.slice(0,15) + '…' : n, x + 62, yy + 1);
        o.textAlign = 'right'; o.font = '700 22px Fredoka'; o.fillStyle = '#b07a10'; o.fillText(CFG.board === 'coins' ? v.coins : v.catches, x + w - 24, yy + 1); o.textAlign = 'left'; });
      y += h + 22; } }
  if (feed.length) { head('LATEST', y + 14); y += 40;
    const room = Math.max(0, Math.floor((1010 - y)/80));
    feed.slice(0, room).forEach((e, i) => { const yy = y + i*80, al = clamp((T - e.t0)/0.3, 0, 1); o.globalAlpha = al;
      const bc = e.kind === 'event' ? '#b07dff' : e.kind === 'quest' ? '#3fb8a8' : (e.res ? (e.res.variant === 'golden' ? '#e0a92a' : RARITY[e.res.cr.rarity].col) : '#6f86a8');
      o.fillStyle = 'rgba(12,18,40,0.92)'; o.beginPath(); o.roundRect(x, yy, w, 70, 22); o.fill(); o.lineWidth = 3; o.strokeStyle = bc; o.stroke();
      if (e.res) { const C = crImg(e.res); if (C) { const s = Math.min(64/C.width, 54/C.height); o.drawImage(C, x + 46 - C.width*s/2, yy + 35 - C.height*s/2, C.width*s, C.height*s); } }
      else if (e.item) drawIcon(I['it_'+e.item], x + 46, yy + 35, 48);
      else { star(x + 46, yy + 35, 18, bc); }
      o.fillStyle = e.name ? (RING[scarfOf(e.name)] || '#f4d58c') : '#f4d58c'; o.font = '600 21px Fredoka'; o.textAlign = 'left'; o.fillText(e.name || '', x + 88, yy + 22);
      o.fillStyle = '#fff8ea'; o.font = '700 22px Fredoka'; let tx = e.text; while (o.measureText(tx).width > w - 110 && tx.length > 4) tx = tx.slice(0, -2); if (tx !== e.text) tx += '…'; o.fillText(tx, x + 88, yy + 49); });
    o.globalAlpha = 1; }
  o.restore();
}

function drawBoard(){
  const rows = Object.entries(S.viewers).filter(e => e[1].catches > 0).sort((a,b) => (CFG.board === 'coins' ? b[1].coins - a[1].coins : b[1].catches - a[1].catches)).slice(0, 5);
  if (!rows.length) return;
  const x = 22, y = 22, w = 250, h = 54 + rows.length*34;
  o.save(); o.fillStyle = CFG.cardBg; o.beginPath(); o.roundRect(x, y, w, h, 22); o.fill();
  o.lineWidth = 5; o.strokeStyle = CFG.cardAccent; o.stroke();
  o.fillStyle = CFG.cardAccent; o.font = '700 20px Fredoka'; o.textAlign = 'left'; o.textBaseline = 'middle'; o.fillText('TOP FISHERS', x+18, y+26);
  rows.forEach(([n, v], k) => { const yy = y + 60 + k*34;
    o.fillStyle = ['#e0a92a','#a8b4c8','#c8845a','#7a6a8a','#7a6a8a'][k]; o.beginPath(); o.arc(x+30, yy, 12, 0, 7); o.fill();
    o.fillStyle = '#fff8ea'; o.font = '700 15px Fredoka'; o.textAlign = 'center'; o.fillText(k+1, x+30, yy+1);
    o.fillStyle = CFG.cardText; o.textAlign = 'left'; o.font = '600 18px Fredoka'; let nn = n.length > 12 ? n.slice(0,11)+'…' : n; o.fillText(nn, x+52, yy+1);
    o.textAlign = 'right'; o.font = '700 18px Fredoka'; o.fillStyle = '#b07a10'; o.fillText(CFG.board === 'coins' ? v.coins : v.catches, x+w-18, yy+1); });
  o.restore();
}

// ---------------------------------------------------------------- sound (synthesized, no files)
// sound files (cozy pack). Each sound has a small pool so overlapping catches don't cut each other.
const SND_NAMES = ['join','cast','bite','reel','cheer','catch_common','catch_rare','catch_epic','catch_legendary','catch_mythic','shiny','golden','new','quest','menu','buy','coins','nope','storm','raid'];
const SNDP = {}; const SOUND = () => CFG.sound !== false && !/capture=1/.test(location.search);
function sndBase(){ return AB() + 'snd/'; }
function play(k, vol = 1){ if (window.SND_LOG && CFG.sound !== false) { window.SND_LOG.push({ t: T, k, v: clamp((CFG.volume ?? 0.8) * vol, 0, 1) }); return; } if (!SOUND()) return; try {
  const pool = SNDP[k] || (SNDP[k] = []); let au = pool.find(x => x.paused || x.ended);
  if (!au) { if (pool.length >= 4) au = pool[0]; else { au = new Audio(sndBase() + k + '.mp3'); pool.push(au); } }
  au.volume = clamp((CFG.volume ?? 0.8) * vol, 0, 1); au.currentTime = 0; const p = au.play(); if (p && p.catch) p.catch(() => {}); } catch(e) {} }
function sfx(k, res){
  if (k === 'catch' && res.cr.rarity === 'junk') { play('junk_frozenpizza'); return; }
  if (k === 'catch') { play('catch_' + (res.cr.rarity === 'holiday' ? 'rare' : res.cr.rarity));
    if (res.variant === 'golden') later(0.35, () => play('golden')); else if (res.variant === 'shiny') later(0.35, () => play('shiny'));
    return; }
  play(k);
}

// ---------------------------------------------------------------- panels
const SIL = {};
function silhouette(id){ if (SIL[id]) return SIL[id]; const im = I['cr_'+id]; if (!im) return null; const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d');
  x.drawImage(im,0,0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#2a3156'; x.fillRect(0,0,c.width,c.height); return SIL[id] = c; }
function card(x, y, w, h, title, sub){
  o.shadowColor = 'rgba(0,0,0,0.45)'; o.shadowBlur = 24; o.shadowOffsetY = 10;
  o.fillStyle = CFG.cardBg; o.beginPath(); o.roundRect(x, y, w, h, 28); o.fill(); o.shadowColor = 'transparent';
  o.lineWidth = 7; o.strokeStyle = CFG.cardAccent; o.stroke(); o.lineWidth = 2.5; o.strokeStyle = '#e6c27c'; o.beginPath(); o.roundRect(x+9, y+9, w-18, h-18, 21); o.stroke();
  o.fillStyle = CFG.cardAccent; o.beginPath(); o.roundRect(x + w/2 - 150, y - 22, 300, 44, 22); o.fill(); o.lineWidth = 3; o.strokeStyle = '#e6c27c'; o.stroke();
  o.fillStyle = '#fff8ea'; o.font = '700 24px Fredoka'; o.textAlign = 'center'; o.textBaseline = 'middle'; o.fillText(title, x + w/2, y + 1);
  if (sub) { o.fillStyle = CFG.cardText; o.font = '600 19px Fredoka'; o.fillText(sub, x + w/2, y + 40); }
}
function drawIcon(im, cx, cy, box){ if (!im) return; const s = Math.min(box/im.width, box/im.height); o.drawImage(im, cx - im.width*s/2, cy - im.height*s/2, im.width*s, im.height*s); }
function rowsCard(x, y, w, h, title, sub){ card(x, y, w, h, title, sub); }
function drawPanel(){
  if (!panel) return;
  const a = T - panel.t0, k = clamp(a/0.35, 0, 1), out = clamp((panel.dur - a)/0.3, 0, 1);
  const v = viewer(panel.name), x = SIDE ? PCX : 102, w = SIDE ? PCW : 820;
  const place = h => SIDE ? Math.max(30, Math.round((1024 - h)/2)) : 1000 - h;
  o.save(); o.globalAlpha = out; o.translate(SIDE ? (1 - back(k))*(MLEFT ? -60 : 60) : 0, SIDE ? 0 : (1 - back(k))*80);
  o.textBaseline = 'middle';
  if (panel.kind === 'shop') {
    const rh = SIDE ? 70 : 74, h = 116 + ITEMS.length*rh, y = place(h), big = !SIDE;
    card(x, y, w, h, 'ICE SHOP', panel.name + ' · ' + v.coins + ' coins · type the number to buy');
    ITEMS.forEach((it, i) => { const yy = y + 82 + i*rh + rh/2, ok = v.coins >= it.price;
      o.globalAlpha = out * (ok ? 1 : 0.55);
      o.fillStyle = ok ? '#fde9c4' : '#efe4d4'; o.beginPath(); o.roundRect(x + 22, yy - rh/2 + 4, w - 44, rh - 8, 16); o.fill();
      o.fillStyle = CFG.cardAccent; o.beginPath(); o.roundRect(x + 32, yy - 16, 40, 32, 12); o.fill(); o.fillStyle = '#fff8ea'; o.font = '700 20px Fredoka'; o.textAlign = 'center'; o.fillText(i+1, x + 52, yy + 1);
      drawIcon(I['it_'+it.id], x + 104, yy, big ? 50 : 42);
      o.textAlign = 'left'; o.fillStyle = '#4a1418'; o.font = '700 ' + (big ? 22 : 20) + 'px Fredoka'; o.fillText(it.name, x + 138, yy - (big ? 12 : 10));
      o.fillStyle = '#7a5a3a'; o.font = '600 ' + (big ? 18 : 16) + 'px Fredoka'; o.fillText(it.desc, x + 138, yy + (big ? 14 : 11));
      o.textAlign = 'right'; o.fillStyle = '#b07a10'; o.font = '700 21px Fredoka'; o.fillText(it.price, x + w - 40, yy + 1);
      o.fillStyle = '#e0a92a'; o.beginPath(); o.arc(x + w - 52 - o.measureText(String(it.price)).width, yy, 9, 0, 7); o.fill(); });
    o.globalAlpha = out;
  }
  if (panel.kind === 'dex') {
    const ids = CREATURES.map(c => c.id); const got = new Set(Object.keys(v.dex).map(x => x.replace(/_(shiny|golden)$/,'')));
    const cols = SIDE ? 8 : 12, cell = (w - 52)/cols, rows = Math.ceil(ids.length/cols), jh = JUNK.length ? 30 + cell*0.75 : 0, h = 124 + rows*cell + jh, y = place(h);
    card(x, y, w, h, panel.name.toUpperCase() + "'S FISHDEX", got.size + ' / ' + ids.length + ' found · ' + Object.keys(v.dex).filter(k=>/_shiny$/.test(k)).length + ' shiny · ' + Object.keys(v.dex).filter(k=>/_golden$/.test(k)).length + ' golden');
    // progress bar
    o.fillStyle = '#e6dccb'; o.beginPath(); o.roundRect(x + 40, y + 66, w - 80, 12, 6); o.fill();
    o.fillStyle = '#3fb8a8'; o.beginPath(); o.roundRect(x + 40, y + 66, Math.max(12, (w - 80)*got.size/ids.length), 12, 6); o.fill();
    const jk = JUNK.map(j => j.id), jy = y + h - 4; if (jk.length) { /* junk drawer below */ }
    ids.forEach((id, i) => { const cx = x + 26 + (i%cols)*cell + cell/2, cy = y + 100 + Math.floor(i/cols)*cell + cell/2;
      o.fillStyle = got.has(id) ? '#fde9c4' : '#e6dccb'; o.beginPath(); o.roundRect(cx - cell/2 + 3, cy - cell/2 + 3, cell - 6, cell - 6, 12); o.fill();
      drawIcon(got.has(id) ? I['cr_'+id] : silhouette(id), cx, cy, cell - 14);
      if (v.dex[id+'_golden']) star(cx + cell/2 - 9, cy - cell/2 + 9, 8, '#e0a92a'); else if (v.dex[id+'_shiny']) star(cx + cell/2 - 9, cy - cell/2 + 9, 8, '#b98aff'); });
    if (JUNK.length) { const jy0 = y + 112 + rows*cell, jc = cell*0.75; o.fillStyle = '#7a5a3a'; o.font = '700 18px Fredoka'; o.textAlign = 'left'; o.textBaseline = 'middle'; o.fillText('JUNK DRAWER', x + 30, jy0);
      JUNK.forEach((j, i) => { const cx = x + 30 + 130 + i*(jc + 4) + jc/2, cy = jy0; const has = v.dex[j.id];
        o.fillStyle = has ? '#efe0c8' : '#e6dccb'; o.beginPath(); o.roundRect(cx - jc/2 + 2, cy - jc/2 + 2, jc - 4, jc - 4, 10); o.fill(); drawIcon(has ? I['cr_'+j.id] : silhouette(j.id), cx, cy, jc - 10); }); }
  }
  if (panel.kind === 'quests') {
    const list = QUESTS.filter(q => !(v.q||{})[q.id]).slice(0, 6), rh = 76, h = 120 + list.length*rh, y = place(h);
    card(x, y, w, h, 'QUESTS', panel.name + ' · ' + Object.keys(v.q||{}).length + ' / ' + QUESTS.length + ' done');
    list.forEach((q, i) => { const yy = y + 92 + i*rh, p = clamp(statOf(v, q.stat)/q.goal, 0, 1);
      o.textAlign = 'left'; o.fillStyle = '#4a1418'; o.font = '700 22px Fredoka'; o.fillText(q.name, x + 40, yy + 4);
      o.textAlign = 'right'; o.fillStyle = '#b07a10'; o.font = '700 21px Fredoka'; o.fillText('+' + q.reward, x + w - 40, yy + 4);
      const bw = w - 80; o.fillStyle = '#e6dccb'; o.beginPath(); o.roundRect(x + 40, yy + 24, bw, 22, 11); o.fill();
      o.fillStyle = '#3fb8a8'; o.beginPath(); o.roundRect(x + 40, yy + 24, Math.max(22, bw*p), 22, 11); o.fill();
      o.fillStyle = '#4a1418'; o.font = '600 16px Fredoka'; o.textAlign = 'center'; o.fillText(Math.min(statOf(v,q.stat), q.goal) + ' / ' + q.goal, x + 40 + bw/2, yy + 36); });
  }
  if (panel.kind === 'bag') {
    const list = v.fx || [], rh = 70, h = 130 + Math.max(1, list.length)*rh, y = place(h);
    card(x, y, w, h, 'BACKPACK', panel.name + ' · ' + v.coins + ' coins');
    if (!list.length) { o.fillStyle = '#7a5a3a'; o.font = '600 22px Fredoka'; o.textAlign = 'center'; o.fillText('empty · try !shop', x + w/2, y + 110); }
    list.forEach((e, i) => { const it = ITEM[e.id], yy = y + 104 + i*rh; drawIcon(I['it_'+e.id], x + 70, yy, 50);
      o.textAlign = 'left'; o.fillStyle = '#4a1418'; o.font = '700 22px Fredoka'; o.fillText(it.name, x + 110, yy - 11);
      o.fillStyle = '#7a5a3a'; o.font = '600 18px Fredoka'; o.fillText(it.desc, x + 110, yy + 14);
      o.textAlign = 'right'; o.fillStyle = '#3f8a7a'; o.font = '700 20px Fredoka'; o.fillText(e.left < 0 ? 'forever' : e.left + ' left', x + w - 40, yy); });
  }
  o.restore();
}
function drawHints(){
  // idle hint sign
  const any = fishers.some(f => f); if (any) quietSince = T;
  const qa = clamp((T - quietSince - (CFG.hintDelay ?? 20))/0.6, 0, 1);
  if (qa > 0 && CFG.hint && CFG.showHint) { const y = 960 + Math.sin(T*2)*4; o.save(); o.globalAlpha = qa; o.font = '700 26px Fredoka'; const w = o.measureText(CFG.hint).width + 60;
    o.fillStyle = CFG.cardBg; o.beginPath(); o.roundRect(512 - w/2, y - 28, w, 56, 28); o.fill(); o.lineWidth = 5; o.strokeStyle = CFG.cardAccent; o.stroke();
    o.fillStyle = CFG.cardAccent; o.textAlign = 'center'; o.textBaseline = 'middle'; o.fillText(CFG.hint, 512, y + 1); o.restore(); }
  // waiting line
  if (queue.length) { const names = queue.slice(0, 3).join(', ') + (queue.length > 3 ? ' +' + (queue.length - 3) : '');
    const txt = 'also fishing: ' + names; o.save(); o.font = '700 20px Fredoka'; const w = o.measureText(txt).width + 40, y = 950;
    o.fillStyle = 'rgba(14,20,44,0.88)'; o.beginPath(); o.roundRect(512 - w/2, y - 22, w, 44, 22); o.fill(); o.lineWidth = 3; o.strokeStyle = '#e6c27c'; o.stroke();
    o.fillStyle = '#fff8ea'; o.textAlign = 'center'; o.textBaseline = 'middle'; o.fillText(txt, 512, y + 1); o.restore(); }
}
function toastLabel(t){ return t.t === 'catch' ? 'caught ' + t.text : t.t === 'quest' ? '★ ' + t.text + '  +' + t.reward : t.t === 'coins' ? t.text : t.t === 'nope' ? t.text : t.t === 'event' ? t.text + '  thanks ' + t.name + '!' : (t.t === 'gift' ? 'gift: ' : 'bought ') + t.text; }
function drawToasts(){
  const loose = [];
  if (SIDE) toasts.forEach(t => { if (!t.fed && t.t !== 'catch' && (t.t !== 'nope' || spotOf(t.name) < 0)) { t.fed = true; feedAdd({ kind: t.t === 'quest' ? 'quest' : t.t === 'event' ? 'event' : 'note', name: t.name, item: t.item, text: t.t === 'nope' ? t.text : t.t === 'quest' ? (t.group ? 'completed ' + t.text + '!  +' + t.reward : 'quest done: ' + t.text + '  +' + t.reward) : toastLabel(t) }); } });
  toasts.forEach(t => { if (SIDE && t.fed) return; const a = T - t.t0, al = clamp(a/0.2,0,1) * clamp((3.2-a)/0.3,0,1); const i = t.t === 'event' ? -1 : spotOf(t.name);
    if (i < 0) { loose.push(t); return; }
    const sp = SPOTS[i], hx = sp.st[0] + (sp.flip ? -12 : 12), stack = toasts.filter(u => u !== t && spotOf(u.name) === i && u.t0 > t.t0).length;
    pillToast(t, hx, sp.st[1] - 212 - a*14 - stack*48, al, 'center'); });
  if (!SIDE) loose.slice(-3).forEach((t, k) => { const a = T - t.t0, al = clamp(a/0.2,0,1) * clamp((3.2-a)/0.3,0,1); pillToast(t, 24, 300 + k*56, al, 'left', true); });
  window.__loose = loose;
}
function pillToast(t, x, y, al, align, withName){
  o.save(); o.globalAlpha = al; o.font = '700 21px Fredoka'; const label = (withName && t.t !== 'event' ? t.name + ': ' : '') + toastLabel(t);
  const w = o.measureText(label).width + (t.item ? 70 : 36), x0 = align === 'center' ? x - w/2 : x;
  o.fillStyle = t.t === 'quest' ? '#2f7a5a' : t.t === 'event' ? '#5a3a9a' : t.t === 'nope' ? '#7a3040' : 'rgba(14,20,44,0.92)';
  o.beginPath(); o.roundRect(x0, y - 22, w, 44, 22); o.fill(); o.lineWidth = 3; o.strokeStyle = '#e6c27c'; o.stroke();
  if (t.item) drawIcon(I['it_'+t.item], x0 + 28, y, 32);
  o.fillStyle = '#fff8ea'; o.textAlign = 'left'; o.textBaseline = 'middle'; o.fillText(label, x0 + (t.item ? 52 : 18), y + 1); o.restore();
}
function drawStorm(){
  if (T >= storm.until) return; const left = storm.until - T, a = clamp(left/1, 0, 1);
  const txt = storm.kind === 'raid' ? 'RAID · FISH ARE BITING' : 'AURORA STORM · LEGENDARY x3';
  const secs = Math.ceil(left), tm = Math.floor(secs/60) + ':' + String(secs%60).padStart(2, '0');
  o.save(); o.globalAlpha = a; o.textBaseline = 'middle';
  o.font = '700 22px Fredoka'; const tw = o.measureText(txt).width;
  o.font = '700 18px Fredoka'; const cw = o.measureText('0:00').width + 22;   // fixed-width timer pill: never grows, never overlaps
  const w = 22 + tw + 14 + cw + 8, x = W - 24 - w, y = 26;
  const g = o.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, '#5fffb0'); g.addColorStop(0.5, '#4fd8ff'); g.addColorStop(1, '#b07dff');
  o.fillStyle = 'rgba(14,20,44,0.9)'; o.beginPath(); o.roundRect(x, y, w, 46, 23); o.fill(); o.lineWidth = 4; o.strokeStyle = g; o.stroke();
  o.fillStyle = '#fff8ea'; o.textAlign = 'left'; o.font = '700 22px Fredoka'; o.fillText(txt, x + 22, y + 24);
  const px = x + w - 8 - cw; o.fillStyle = 'rgba(79,216,255,0.18)'; o.beginPath(); o.roundRect(px, y + 8, cw, 30, 15); o.fill();
  o.fillStyle = '#b8f0ff'; o.textAlign = 'center'; o.font = '700 18px Fredoka'; o.fillText(tm, px + cw/2, y + 24); o.restore();
}

const BIOME = {
  christmas: { img:'isla_cut',    win:'em_window',        lant:'em_lant',        tint:'#8d9ce0', sky:'aurora',    weather:'snow',   ice:true,  floor:true, moon:'#6a8cff' },
  winter:    { img:'isla_winter', win:'em_window_winter', lant:'em_lant_winter', tint:'#8d9ce0', sky:'aurora',    weather:'snow',   ice:true,  moon:'#6a8cff' },
  spring:    { img:'isla_spring', win:'em_window_spring', lant:'em_lant_spring', tint:'#b4b0e4', sky:'fireflies', weather:'petals', ice:false, moon:'#8a8cff' },
  autumn:    { img:'isla_autumn', win:'em_window_autumn', lant:'em_lant_autumn', tint:'#c6a4b4', sky:'dusk',      weather:'leaves', ice:false, moon:'#ff9a6a' },
};
const XLIP = [[58,548],[150,578],[250,618],[350,658],[440,700],[505,732],[590,694],[690,646],[790,602],[890,560],[962,524]];
const XBULBS = (() => { const out = []; for (let k = 0; k + 1 < XLIP.length; k++){ const [ax, ay] = XLIP[k], [bx, by] = XLIP[k+1];
  for (let j = 1; j <= 5; j++){ const u = j/6; out.push({ x: ax + (bx-ax)*u, y: ay + (by-ay)*u + Math.sin(Math.PI*u)*20 + 8, c: ['#ff4f5a','#ffd24a','#4fe08a','#4fb8ff','#ff8ad8'][(k*5+j)%5], k: k*5+j }); } } return out; })();
function xmasLights(glowPass){
  if (!glowPass) {
    for (let k = 0; k + 1 < XLIP.length; k++){ const [ax, ay] = XLIP[k], [bx, by] = XLIP[k+1];
      for (let i = 0; i <= 30; i++){ const u = i/30; o.fillStyle = '#1a3a2a'; o.fillRect(Math.round((ax+(bx-ax)*u)/2)*2, Math.round((ay+(by-ay)*u+Math.sin(Math.PI*u)*20+6)/2)*2, 3, 3); } }
    XLIP.forEach(([x, y], i) => { if (i === 0 || i === XLIP.length-1) return; // red bows at anchors
      block(x-PX, y+PX, '#d8303a'); block(x+PX, y+PX, '#d8303a'); block(x, y+PX, '#ff5a64'); block(x-2*PX, y, '#b0202a'); block(x+2*PX, y, '#b0202a'); block(x, y+2*PX, '#b0202a'); block(x, y+3*PX, '#b0202a'); });
  }
  XBULBS.forEach(b => { const on = ((Math.floor(T*2) + b.k) % 3) !== 0;
    if (glowPass) { if (on) glow(b.x, b.y, 22, b.c, 0.45); }
    else { block(b.x, b.y-PX, '#3a4a3a'); block(b.x, b.y, on ? b.c : '#4a3a4a'); block(b.x, b.y+PX, on ? '#ffffff' : '#3a2a3a', on ? 0.6 : 1); } });
}
const FLIES = Array.from({length: 12}, (_, i) => ({ x: 120 + (i*137)%760, y: 260 + (i*89)%300, p: i*1.7 }));
// ---------------------------------------------------------------- frame
function render(){
  const tt = T % LOOP;
  o.clearRect(0, 0, CW, H);
  o.save(); o.translate(IX, 0);
  const bigNow = popup && !popup.escape && (['legendary','mythic'].includes(popup.res.cr.rarity)) ? clamp(1 - (T - popup.t0)/popup.dur, 0, 1) : 0;
  const B = BIOME[CFG.season] || BIOME.christmas, stormK = T < storm.until && storm.kind === 'aurora' ? 0.8 : 0;
  if (B.sky === 'aurora' || stormK || bigNow) aurora(T, Math.max(bigNow, stormK) + (B.sky === 'aurora' ? 0 : -0.1));
  const bob = Math.round(Math.sin(2*Math.PI*tt/6)*2) * PX/2;
  o.save(); o.translate(0, bob);
  o.imageSmoothingEnabled = false; o.drawImage(graded(B.img, B.tint), 0, 0);
  const win = 0.92 + 0.08*Math.sin(T*7.3)*Math.sin(T*3.1);
  o.globalAlpha = win; o.drawImage(I[B.win], 0, 0); if (B.floor) { o.globalAlpha = 0.25*win; o.drawImage(I.em_floor, 0, 0); } o.globalAlpha = 1;
  const lon = LANT.map((_, i) => ((T*1.4 + i*0.53) % 4) > 0.22 ? 1 : 0.35);
  o.drawImage(I[B.lant], 0, 0);
  if (CFG.season === 'christmas') xmasLights(false);
  if (CFG.season === 'christmas') { const tg = Math.floor(T*2.5) % 3; ['em_tree1','em_tree2','em_tree3'].forEach((n, i) => { o.globalAlpha = i === tg ? 0.25 : 1; o.drawImage(I[n], 0, 0); }); o.globalAlpha = 1; o.drawImage(I.em_star, 0, 0); }
  // raid: a school of fish swimming under the surface
  if (T < storm.until && storm.kind === 'raid') { const k = clamp((storm.until - T)/1.5, 0, 1) * clamp((T - (storm.until - (CFG.raidSecs||45)))/1.5, 0, 1);
    const FISH = ['..XX..', '.XXXX.X', 'XXXXXXX', '.XXXX.X', '..XX..'];
    for (let n = 0; n < 12; n++){ const ph = T*0.5 + n*0.52, x = 430 + Math.cos(ph)*125 + Math.sin(n*7)*16, y = 566 + Math.sin(ph)*46 + Math.cos(n*3)*8, dir = -Math.sin(ph) > 0 ? 1 : -1;
      FISH.forEach((row, j) => { for (let q = 0; q < row.length; q++) if (row[q] === 'X') block(x + dir*(3 - q)*PX, y + (j - 2)*PX, '#0e2a52', 0.75*k); }); } }
  SPOTS.forEach((s, i) => { const [x, y] = s.hole; const ph = ((T*0.8 + i*0.37) % 1); const rx = 10 + ph*26, ry = rx*0.45; for (let a = 0; a < 6.28; a += 0.35) block(x + Math.cos(a)*rx, y + Math.sin(a)*ry, B.ice ? '#bff0ff' : '#d8f2ff', 0.55*(1-ph)); });
  if (B.ice) ICI.forEach(([x, y], i) => { const ph = (T*0.7 + i*0.61) % 3; if (ph < 0.35){ const k = 1 - Math.abs(ph-0.17)/0.17; block(x,y,'#ffffff',k); block(x-PX,y,'#cfeeff',k*0.7); block(x+PX,y,'#cfeeff',k*0.7); block(x,y-PX,'#cfeeff',k*0.7); block(x,y+PX,'#cfeeff',k*0.7); } });
  for (let i = 0; i < 6; i++){ const a = ((T*0.35 + i/6) % 1); const x = 690 + Math.sin(a*5+i)*10 + a*30, y = 135 - a*130, r = 3 + Math.round(a*5);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx*dx + dy*dy <= r*r) block(x+dx*PX, y+dy*PX, '#c9d0ee', 0.18*(1-a)); }
  // fishers (back to front)
  const heads = [];
  [1, 0, 2].forEach(i => { if (fishers[i]) heads[i] = drawFisher(fishers[i], i); });
  // effects
  fx.forEach(e => { const a = T - e.t0;
    if (e.k === 'puff' && a < 0.6) for (let k = 0; k < 10; k++){ const ang = k*0.63, r = 10 + a*90; block(e.x + Math.cos(ang)*r, e.y + Math.sin(ang)*r*0.6, '#f4f9ff', 1 - a/0.6); }
    if (e.k === 'escape') {}
    else if (e.k === 'leap' && a < 0.55) { const sp = SPOTS[e.i], [hx, hy] = sp.hole, u = a/0.55; const C = crImg(e.res); if (C) { const s = 0.55;
        const x = hx + (sp.st[0] - hx)*u*0.8, y = hy - 20 - Math.sin(Math.PI*u)*120; o.drawImage(graded('cr_'+e.res.cr.id+(e.res.variant==='normal'?'':e.res.variant==='shiny'?'_shiny':'_gold'),'#d0d8ff') || C, x - C.width*s/2, y - C.height*s/2, C.width*s, C.height*s); }
      for (let k = 0; k < 8; k++){ const ang = -Math.PI*(0.1 + 0.8*k/7), r = 10 + u*70; block(hx + Math.cos(ang)*r, hy - 6 + Math.sin(ang)*r*0.7 + u*u*60, '#d8f4ff', 1-u); } }
  });
  // light
  o.globalCompositeOperation = 'lighter';
  glow(708,322,120,'#ffb04a',0.30*win,0.8); glow(708,322,40,'#ffe9a8',0.35*win); glow(740,395,110,'#ffcf80',0.12*win,0.45);
  LANT.forEach(([x, y], i) => glow(x, y+6, 46, LCOL[i], 0.40*lon[i]));
  if (CFG.season === 'christmas') xmasLights(true);
  if (CFG.season === 'christmas') { glow(456,210,40,'#ffe08a',0.55); glow(455,290,90,'#ff9ad0',0.10 + 0.04*Math.sin(T*2)); }
  SPOTS.forEach(s => glow(s.hole[0], s.hole[1], 60, '#4fd8ff', B.ice ? 0.14 : 0.08, 0.5));
  glow(150, 140, 500, B.moon, 0.07);
  if (B.sky === 'fireflies') FLIES.forEach((f, i) => { const x = f.x + Math.sin(T*0.6 + f.p)*40, y = f.y + Math.cos(T*0.45 + f.p*1.3)*26, on = 0.5 + 0.5*Math.sin(T*2.2 + f.p*3);
    glow(x, y, 16, '#d8ff7a', 0.5*on); block(x, y, '#f4ffc0', on); });
  fx.forEach(e => { if (e.k === 'leap') { const a = T - e.t0; const R = e.res; const col = R.variant==='golden' ? '#ffd36a' : RARITY[R.cr.rarity].col; glow(SPOTS[e.i].hole[0], SPOTS[e.i].hole[1]-40, 180, col, 0.35*clamp(1 - a/2, 0, 1)); } });
  o.globalCompositeOperation = 'source-over';
  fishers.forEach((f, i) => { if (f && heads[i]) pill(heads[i].x, heads[i].y, f.name, RING[f.scarf]); });
  drawEscapes();
  o.restore();
  // snow
  if (B.weather === 'snow') snow.forEach(s => { const laps = s.near ? 3 : 2; const y = (s.y0 + (tt/LOOP)*laps*H) % H; const x = s.x + Math.round(Math.sin(tt*1.1 + s.ph)*1.5)*PX;
    block(x, y, s.near ? '#f4f9ff' : '#9fb2e0', s.near ? 1 : 0.8); if (s.near) block(x, y+PX, '#c8d8f2', 0.6); });
  else snow.slice(0, 40).forEach((s, i) => { const laps = 1; const y = (s.y0 + (tt/LOOP)*laps*H) % H; const x = s.x + Math.round(Math.sin(tt*0.9 + s.ph)*6)*PX; const flip = Math.floor(tt*4 + i) % 2;
    const c = B.weather === 'petals' ? (i%3 ? '#ffc4dc' : '#ff9ec4') : ['#e8742a','#d8402a','#f2b23a'][i%3];
    block(x, y, c, 0.95); block(x + (flip ? PX : -PX), y + (i%2 ? PX : 0), c, 0.7); });
  if (CFG.showBoard && !SIDE) drawBoard();
  drawStorm();
  drawHints();
  if (!SIDE) drawPanel();
  drawPopup();
  drawToasts();
  o.restore();
  if (SIDE) { drawColumn(); drawPanel(); }
  if (CFG.autoHide > 0) { const busy = fishers.some(f => f) || panel || popup || T < storm.until; if (busy) lastAct = T;
    cv.style.transition = 'opacity 0.8s'; cv.style.opacity = (T - lastAct > CFG.autoHide) ? 0 : 1; }
  if (window.EXE_OVERLAY) window.EXE_OVERLAY(o, T);
}

window.EXE_DEBUG = () => ({ T, storm: { active: T < storm.until, kind: storm.kind, left: Math.round(storm.until - T) }, fishers: fishers.map(f => f && f.name), ghosts: ghosts.map(g => g.name), queue: queue.slice() });
window.advance = (dt) => { step(dt); render(); };
window.renderAt = () => render();
if (!/capture=1/.test(location.search)) READY.then(() => { let last = performance.now(); (function L(now){ const dt = Math.min(0.1, (now - last)/1000); last = now; step(dt); render(); requestAnimationFrame(L); })(last); });
})();
