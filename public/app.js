import {budget,catalog,generateDungeon,ndTable,presets,trap,validateParty} from './rules.js';
import {READY,PRESENT,creatureScene,fitMap,roomScene,validArt} from './projection.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const icon = name => '<svg aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
const pt = new Intl.NumberFormat('pt-BR');
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));
const names = {mobs:'criatura',loot:'baú',traps:'armadilha',description:'descrição'};
const roomIcon = room => room.type==='Entrada'?'door-open':room.type==='Objetivo'?'flag':
  room.mobs.length?'swords':room.traps.length?'triangle-alert':room.loot.length?'archive':'book-open';
const savedKey = 'dungeon-forge:current:v1';

function loadDungeon() {
  try {
    const dungeon = JSON.parse(localStorage.getItem(savedKey));
    if (!dungeon || dungeon.schema!==1 || !validateParty(dungeon.party) ||
      !Array.isArray(dungeon.rooms) || dungeon.rooms.length<5 || dungeon.rooms.length>12 ||
      !dungeon.rooms.every(room=>room && typeof room.name==='string' && typeof room.text==='string' &&
        ['x','y','w','h'].every(key=>Number.isFinite(room[key])) && ['mobs','loot','traps'].every(key=>Array.isArray(room[key]))) ||
      !Array.isArray(dungeon.links) || !dungeon.links.every(link=>Array.isArray(link) && link.length===2 &&
        link.every(id=>Number.isInteger(id) && !!dungeon.rooms[id])) || !Array.isArray(dungeon.notices) ||
      !Number.isInteger(dungeon.selected) || !dungeon.rooms[dungeon.selected]) return null;
    return dungeon;
  } catch {
    return null;
  }
}

const createForm = $('#create-form');
const editDialog = $('#editor');
const editForm = $('#edit-form');
const stored = loadDungeon();
const state = {
  room:stored?.selected??0,tab:'mobs',dungeon:stored,view:'criar',zoom:1,edit:null,
  shared:new Set(),projection:null,levels:[]
};
const origin = window.location.origin;
let playerWindow = null;
let playerReady = false;

function sendScene() {
  if (playerReady && playerWindow && !playerWindow.closed) {
    playerWindow.postMessage({type:PRESENT,scene:state.projection},origin);
  }
}

function openPlayers() {
  if (playerWindow && !playerWindow.closed) {
    playerWindow.focus();
    return;
  }
  playerReady = false;
  playerWindow = window.open('./jogadores.html','dungeon-forge-jogadores','popup');
  if (!playerWindow) notify('O navegador bloqueou a janela. Permita pop-ups para abrir a tela dos jogadores.');
}

function publishScene(scene, open = false) {
  state.projection = scene;
  if (open) openPlayers();
  sendScene();
  renderBroadcast();
}

window.addEventListener('message',event=>{
  if (event.source!==playerWindow || event.origin!==origin || event.data?.type!==READY) return;
  playerReady = true;
  sendScene();
  renderBroadcast();
});

function saveDungeon() {
  state.dungeon.selected = state.room;
  const status = $('#saved');
  try {
    localStorage.setItem(savedKey,JSON.stringify(state.dungeon));
    status.removeAttribute('data-error');
    status.textContent = 'Salva neste navegador';
    return true;
  } catch {
    status.setAttribute('data-error','');
    status.textContent = 'Sem espaço ou acesso ao armazenamento. Alterações apenas nesta aba.';
    return false;
  }
}

let feedbackTimer;
const options = (from, to, initial) => Array.from({length:to-from+1}, (_, index) => {
  const value = from + index;
  return '<option value="' + value + '"' + (value === initial ? ' selected' : '') + '>' + value + '</option>';
}).join('');
$('#party-count').innerHTML = options(2,8,4);
$('#party-level').innerHTML = options(1,20,3);

function readSettings() {
  const size = $('#size').value;
  const difficulty = createForm.elements.difficulty.value;
  const common = Number($('#party-level').value);
  const levels = $('#mixed').checked
    ? $$('#individual select').map(input => Number(input.value))
    : Array(Number($('#party-count').value)).fill(common);
  return {levels, difficulty, size:size === 'auto' ? difficulty : size, boss:$('#boss').value};
}

const lootSum = room => room.loot.reduce((total, chest) => total + chest.gold,0);
const totalXp = room => room.mobs.reduce((total, mob) => total + mob.xp,0);
const room = () => state.dungeon.rooms[state.room];
const countLabel = index => String(index+1).padStart(2,'0');

function formChanged(event) {
  if (!event || ['mixed','party-count','party-level'].includes(event.target.id)) {
    const mixed = $('#mixed').checked;
    const common = Number($('#party-level').value);
    const current = $$('#individual select').map(input => Number(input.value));
    if (current.length) state.levels = current;
    $('#shared-label').hidden = mixed;
    $('#individual').hidden = !mixed;
    if (mixed) {
      $('#individual').innerHTML = Array.from({length:Number($('#party-count').value)}, (_, index) =>
        '<label>Personagem ' + (index+1) + '<select aria-label="Nível do personagem ' + (index+1) + '">' +
        options(1,20,state.levels[index] || common) + '</select></label>').join('');
    } else $('#individual').replaceChildren();
  }
  const settings = readSettings();
  const profile = presets[settings.size];
  $('#estimate').innerHTML = [
    ['map','Salas',profile.rooms],['swords','Combates',profile.mobs],
    ['triangle-alert','Armadilhas',profile.traps],['archive','Baús',profile.loot],
    ['shield','XP por combate',pt.format(budget(settings))]
  ].map(([symbol,title,value]) => '<div><dt>' + icon(symbol) + title + '</dt><dd>' + value + '</dd></div>').join('');
}

function navigate(view, focus = true) {
  if (!['criar','mesa'].includes(view)) return;
  if (view === 'mesa' && !state.dungeon) {
    window.history.replaceState(null,'','#criar');
    notify('Gere uma dungeon para abrir a mesa.');
    view = 'criar';
  }
  state.view = view;
  ['criar','mesa'].forEach(key=>{ $('#'+key).hidden=view!==key; });
  $$('[data-view]').forEach(link=>{
    if(link.dataset.view===view) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
  if (view==='mesa') renderDesk();
  if (focus) {
    window.scrollTo(0,0);
    $('#'+view+' h1').focus({preventScroll:true});
  }
}

function notify(message, undo) {
  clearTimeout(feedbackTimer);
  const feedback = $('#feedback');
  feedback.textContent = message;
  if (undo) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button';
    button.textContent = 'Desfazer';
    button.addEventListener('click', () => {
      undo();
      notify('Remoção desfeita.');
    });
    feedback.append(' ',button);
  }
  feedbackTimer = setTimeout(() => { feedback.replaceChildren(); },undo ? 12000 : 5000);
}

function roomRect(data, pad, className) {
  return '<rect class="' + className + '" x="' + (data.x - data.w/2 + pad) + '" y="' +
    (data.y - data.h/2 + pad) + '" width="' + (data.w-2*pad) + '" height="' + (data.h-2*pad) + '" rx="3"/>';
}

function geometry() {
  const edges = state.dungeon.links.map(([a,b]) => {
    const from = state.dungeon.rooms[a], to = state.dungeon.rooms[b];
    const path = 'M ' + from.x + ' ' + from.y + ' L ' + to.x + ' ' + to.y;
    return '<path class="corridor-border" d="' + path + '"/><path class="corridor-fill" d="' + path + '"/>';
  }).join('');
  return edges + state.dungeon.rooms.map((data,index) => {
    const revealed = state.shared.has(index);
    const properties = 'class="map-room" role="button" tabindex="0" data-map-room="' + index +
      '" aria-pressed="' + (state.room===index) + '" aria-label="' + escapeHtml(data.name) + (revealed ? ', revelada' : ', privada') + '"';
    return '<g ' + properties + '><title>' + escapeHtml(data.name) + '</title>' +
      roomRect(data,0,'room-wall') + roomRect(data,8,'room-wall-inner') + (revealed ? roomRect(data,14,'room-shared-marker') : '') +
      '<text class="map-label" x="' + data.x + '" y="' + (data.y+7) + '" text-anchor="middle">' + countLabel(index) + '</text></g>';
  }).join('');
}

function zoomMap(centerIndex = state.room) {
  const [x,y,fullWidth,fullHeight] = fitMap(state.dungeon.rooms);
  const width = fullWidth / state.zoom;
  const height = fullHeight / state.zoom;
  const center = state.zoom === 1 ? {x:x+width/2,y:y+height/2} : state.dungeon.rooms[centerIndex];
  $('#map').setAttribute('viewBox',[center.x-width/2,center.y-height/2,width,height].join(' '));
  $('[data-zoom=out]').disabled = state.zoom <= 1;
  $('[data-zoom=in]').disabled = state.zoom >= 1.8;
}

function drawMap() {
  $('#map').innerHTML = geometry();
  zoomMap();
}
function renderDesk() {
  const notice = $('#generation-notice');
  notice.hidden = !state.dungeon.notices.length;
  notice.textContent = state.dungeon.notices.join(' ');
  const levels = [...new Set(state.dungeon.party.levels)].sort((a,b) => a-b);
  $('#party-line').textContent = state.dungeon.party.levels.length + ' personagens · ' + (levels.length === 1 ? 'Nível ' : 'Níveis ') +
    levels.join(', ') + ' · Dificuldade ' + presets[state.dungeon.party.difficulty].label.toLowerCase() + ' · Semente ' + state.dungeon.seed;
  $('#room-count').textContent = state.dungeon.rooms.length;
  $('#rooms').innerHTML = state.dungeon.rooms.map((data,index) => {
    const selected = state.room === index;
    const revealed = state.shared.has(index);
    const symbol = revealed ? 'eye' : roomIcon(data);
    return '<li><button type="button" aria-pressed="' + selected + '" data-room="' + index + '" aria-label="' +
      escapeHtml(data.name) + (revealed ? ', revelada' : ', privada') + '"><span aria-hidden="true">' + countLabel(index) +
      '</span><span>' + escapeHtml(data.name) + '</span>' + icon(symbol) + '</button></li>';
  }).join('');
  drawMap();
  renderRoom();
  renderBroadcast();
}

function updateRoom(index, source) {
  state.room = index;
  saveDungeon();
  renderDesk();
  const key = source === 'map' ? 'data-map-room' : 'data-room';
  $('[' + key + '="' + index + '"]').focus({preventScroll:true});
}

function renderBroadcast() {
  const connected = playerReady && playerWindow && !playerWindow.closed;
  const status = state.projection
    ? (connected ? 'Em exibição · ' : 'Preparada para exibir · ') + state.projection.title
    : 'Projeção em espera';
  $('#broadcast').innerHTML = icon('monitor') + escapeHtml(status);
  $('#hide-player').disabled = !state.projection;
}

function entryLine(item, index) {
  let meta = state.tab === 'mobs' ? 'ND ' + item.nd + ' · ' + pt.format(item.xp) + ' XP · ' + item.hp + ' PV · CA ' + item.ac :
    state.tab === 'loot' ? pt.format(item.gold) + ' PO' + (item.items ? ' · ' + item.items : '') :
    'CD ' + item.detect + ' para detectar · CD ' + item.disarm + ' para desarmar';
  if (item.custom) meta += ' · Personalizada';
  const title = escapeHtml(item.name);
  return '<li><div><h3>' + title + '</h3><p class="muted">' + escapeHtml(meta) + '</p>' +
    (state.tab==='mobs' && item.actions ? '<p class="muted mob-actions">'+escapeHtml(item.actions)+'</p>' : '') +
    (state.tab==='mobs' ? '<button class="button creature-show" type="button" data-art="' + index + '" aria-label="Mostrar criatura: ' + title + '">' + icon('image') + 'Mostrar criatura</button>' : '') +
    '</div><div class="row-actions">' +
    '<button class="icon-button" type="button" data-edit="' + index + '" aria-label="Editar ' + title + '" title="Editar">' + icon('pencil') + '</button>' +
    '<button class="icon-button" type="button" data-remove="' + index + '" aria-label="Remover ' + title + '" title="Remover">' + icon('trash-2') + '</button></div></li>';
}

function renderRoom() {
  const current = room();
  $('#room-label').textContent = 'Sala ' + countLabel(state.room) + ' · ' + (state.shared.has(state.room) ? 'Revelada' : 'Privada') +
    (current.mobs.some(mob => mob.boss) ? ' · Chefão' : '');
  $('#room-title').textContent = current.name;
  $('#room-text').textContent = current.text;
  $$('.tabs [role=tab]').forEach(button => {
    const active = button.dataset.tab === state.tab;
    button.setAttribute('aria-selected',String(active));
    button.tabIndex = active ? 0 : -1;
  });
  $('#room-content').setAttribute('aria-labelledby','tab-' + state.tab);
  const xp = totalXp(current);
  const cap = budget(state.dungeon.party);
  const summary = {
    mobs: '<div class="xp"><span>Orçamento do encontro</span><strong>' + pt.format(xp) + ' / ' +
      pt.format(cap) + ' XP</strong></div><div class="xp-bar" aria-hidden="true"><span style="width:' +
      Math.min(100,100*xp/cap) + '%"></span></div>' +
      (xp > cap ? '<p class="warning">' + pt.format(xp-cap) + ' XP acima do orçamento.</p>' : ''),
    loot: current.loot.length ? '<p class="xp-note">' + pt.format(lootSum(current)) + ' PO nesta sala</p>' : '',
    traps: ''
  }[state.tab];
  const items = current[state.tab];
  $('#room-content').innerHTML = summary + (items.length ? '<ul class="entries">' + items.map(entryLine).join('') + '</ul>' :
    '<p class="muted">' + ({mobs:'Nenhuma criatura nesta sala.',loot:'Nenhum baú nesta sala.',traps:'Nenhuma armadilha nesta sala.'}[state.tab]) + '</p>') +
    '<button type="button" class="button" data-add>' + icon('plus') + 'Adicionar ' + names[state.tab] + '</button>';
}

function modalField(label, id, {type='text', value='', min, max, required=true} = {}) {
  return '<label>' + label + '<input id="' + id + '" name="' + id + '" type="' + type + '" value="' + escapeHtml(value) +
    '"' + (min === undefined ? '' : ' min="' + min + '"') + (max === undefined ? '' : ' max="' + max + '"') +
    (required ? ' required' : '') + '></label>';
}

function modalText(label,id,value='') {
  return '<label>' + label + '<textarea rows="2" name="' + id + '">' + escapeHtml(value) + '</textarea></label>';
}

function modalSelect(label,id,items,selected) {
  return '<label>' + label + '<select id="' + id + '" name="' + id + '">' +
    items.map(([key,title]) => '<option value="' + escapeHtml(key) + '"' + (String(key) === String(selected) ? ' selected' : '') +
      '>' + escapeHtml(title) + '</option>').join('') + '</select></label>';
}

function openEditor(index, type = state.tab) {
  const adding = index === null;
  const data = type==='description' ? room() : adding ? {} : room()[type][index];
  let fields;
  state.edit = {type,index,adding,room:state.room};
  $('#dialog-context').textContent = room().name;
  $('#dialog-title').textContent = (adding ? 'Adicionar ' : type === 'mobs' ? 'Personalizar ' : 'Editar ') + names[type];
  $('#file-error').hidden=true;
  if (type === 'mobs') {
    fields = adding
      ? modalSelect('Criatura do catálogo','catalog',catalog.map((mob,key) => [key,mob.name + ' · ND ' + mob.nd]),1) +
        modalField('Quantidade','quantity',{type:'number',min:1,max:25,value:1})
      : modalField('Nome','name',{value:data.name}) +
        modalSelect('ND (Nível de Desafio)','nd',ndTable.map(([nd,xp]) => [nd,nd + ' · ' + pt.format(xp) + (nd === '0' ? ' ou 10' : '') + ' XP']),data.nd) +
        '<div id="nd-zero">' + modalSelect('XP no ND 0','zero-xp',[[0,'0 XP'],[10,'10 XP']],data.xp === 10 ? 10 : 0) + '</div>' +
        '<div class="fields pair">' + modalField('Pontos de Vida','hp',{type:'number',min:1,value:data.hp}) +
        modalField('Classe de Armadura','ac',{type:'number',min:1,value:data.ac}) + '</div>' +
        modalText('Ações', 'actions', data.actions) +
        modalField('Nome público (opcional)','public-name',{value:data.publicName,required:false}) +
        '<label>Ilustração (opcional) <input type="file" name="art-file" accept="image/png,image/jpeg,image/webp"><span class="muted">PNG, JPEG ou WebP de até 768 KB.</span></label>';
  } else if (type === 'loot') {
    fields = modalField('Nome do baú','name',{value:data.name}) +
      modalField('Peças de ouro (PO)','gold',{type:'number',min:0,value:data.gold ?? 0}) +
      modalText('Itens','items',data.items);
  } else if (type==='traps') {
    fields = (adding ? modalSelect('Modelo','template',[['blank','Ficha vazia'],['loose','Placa solta']],'blank') : '') +
      modalField('Nome','name',{value:data.name}) + modalText('Pista visível','clue',data.clue) +
      modalField('Gatilho','trigger',{value:data.trigger}) + '<div class="fields pair">' +
      modalField('CD de detecção','detect',{type:'number',min:1,max:30,value:data.detect ?? 12}) +
      modalField('CD de desarme','disarm',{type:'number',min:1,max:30,value:data.disarm ?? 12}) + '</div>' +
      modalText('Consequência','effect',data.effect) + modalText('Como contornar','bypass',data.bypass);
  } else fields=modalText('Descrição que pode ser revelada aos jogadores','text',data.text);
  $('#dialog-fields').innerHTML = fields;
  updateEditWarning();
  editDialog.showModal();
  $('#dialog-fields').querySelector('input,select,textarea')?.focus();
}

function candidateXp() {
  const {adding,index,room:roomIndex} = state.edit;
  const current = state.dungeon.rooms[roomIndex];
  const fields = editForm.elements;
  if (adding) return totalXp(current) + catalog[Number(fields.catalog.value)].xp * Math.max(0,Number(fields.quantity.value));
  const nd = fields.nd.value;
  const result = nd === '0' ? Number(fields['zero-xp'].value) : ndTable.find(([key]) => key === nd)[1];
  return totalXp(current) - current.mobs[index].xp + result;
}

function updateEditWarning() {
  const {type,adding} = state.edit;
  if (type === 'mobs' && !adding) $('#nd-zero').hidden = editForm.elements.nd.value !== '0';
  const overflow = type === 'mobs' ? candidateXp() - budget(state.dungeon.party) : 0;
  const warning = $('#dialog-warning');
  warning.hidden = overflow <= 0;
  warning.textContent = overflow > 0 ? 'O encontro ficará ' + pt.format(overflow) + ' XP acima do orçamento.' : '';
  $('#save-edit').textContent = overflow > 0 ? 'Salvar mesmo assim' : 'Salvar';
}

function pickFields(form,keys) {
  const values = new FormData(form);
  return Object.fromEntries(keys.map(key => [key,values.get(key).trim()]));
}

editForm.addEventListener('input', updateEditWarning);
editForm.addEventListener('change', event => {
  if (event.target.name !== 'template') return;
  const data = event.target.value === 'loose' ? trap() : {name:'',clue:'',trigger:'',detect:12,disarm:12,effect:'',bypass:''};
  Object.entries(data).forEach(([key,value]) => { editForm.elements[key].value = value; });
});

function readArt(file) {
  if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size>768*1024) {
    return Promise.reject(new Error('Escolha um PNG, JPEG ou WebP de até 768 KB.'));
  }
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.addEventListener('load',()=>validArt(reader.result)?resolve(reader.result):reject(new Error('Imagem inválida.')));
    reader.addEventListener('error',()=>reject(new Error('Não foi possível ler a imagem.')));
    reader.readAsDataURL(file);
  });
}

editForm.addEventListener('submit', async event => {
  event.preventDefault();
  const editing = state.edit;
  const {type,adding,index,room:roomIndex} = editing;
  const current = state.dungeon.rooms[roomIndex];
  const list = current[type];
  const fields = editForm.elements;
  if (fields.name && !fields.name.value.trim()) {
    fields.name.setCustomValidity('Informe um nome.');
    fields.name.reportValidity();
    fields.name.addEventListener('input', () => fields.name.setCustomValidity(''), {once:true});
    return;
  }
  if (type==='description') {
    current.text=pickFields(editForm,['text']).text;
  } else if (type === 'mobs' && adding) {
    const selected = catalog[Number(fields.catalog.value)];
    const quantity = Number(fields.quantity.value);
    list.push(...Array.from({length:quantity}, () => ({...selected})));
  } else {
    let data;
    if (type === 'mobs') {
      const xp = candidateXp() - totalXp(current) + list[index].xp;
      data = {...list[index], ...pickFields(editForm,['name','nd','actions']),
        hp:Number(fields.hp.value), ac:Number(fields.ac.value), xp, custom:true,
        publicName:fields['public-name'].value.trim()};
      const art=fields['art-file'].files?.[0];
      if (art) {
        $('#save-edit').disabled=true;
        try {
          data.art=await readArt(art);
        } catch (error) {
          if (state.edit===editing) {
            $('#file-error').textContent=error.message;
            $('#file-error').hidden=false;
          }
          return;
        } finally {
          $('#save-edit').disabled=false;
        }
        if (state.edit!==editing || !editDialog.open) return;
      }
    } else if (type === 'loot') {
      data = {...pickFields(editForm,['name','items']), gold:Number(fields.gold.value)};
    } else {
      data = {...pickFields(editForm,['name','clue','trigger','effect','bypass']),
        detect:Number(fields.detect.value), disarm:Number(fields.disarm.value)};
    }
    if (adding) list.push(data);
    else list[index] = data;
  }
  editDialog.close();
  renderDesk();
  const target = type==='description' ? '#edit-room-text' : adding ? '[data-add]' : '[data-edit="' + index + '"]';
  $(target).focus();
  notify(saveDungeon() ? 'Alteração salva.' : 'Alteração aplicada nesta aba.');
});
$$('[data-cancel]').forEach(button => button.addEventListener('click', () => editDialog.close()));
$('#edit-room-text').addEventListener('click',()=>openEditor(0,'description'));

createForm.addEventListener('change', formChanged);
createForm.addEventListener('submit', event => {
  event.preventDefault();
  $('#generation-error').hidden=true;
  if (state.dungeon && !window.confirm('Substituir a dungeon salva neste navegador?')) return;
  const seed = $('#seed').value.trim() || crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
  let generated;
  try {
    generated=generateDungeon(readSettings(),seed);
  } catch (error) {
    $('#generation-error').textContent=error.message;
    $('#generation-error').hidden=false;
    return;
  }
  state.dungeon=generated;
  state.room=generated.selected;
  state.tab='mobs';
  state.zoom=1;
  clearTimeout(feedbackTimer);
  $('#feedback').replaceChildren();
  state.shared.clear();
  publishScene(null);
  saveDungeon();
  window.location.hash='mesa';
});

$('#rooms').addEventListener('click', event => {
  const target = event.target.closest('[data-room]');
  if (target) updateRoom(Number(target.dataset.room), 'list');
});
$('#map').addEventListener('click', event => {
  const target = event.target.closest('[data-map-room]');
  if (target) updateRoom(Number(target.dataset.mapRoom), 'map');
});
$('#map').addEventListener('keydown', event => {
  const target = event.target.closest('[data-map-room]');
  if (target && ['Enter',' '].includes(event.key)) {
    event.preventDefault();
    updateRoom(Number(target.dataset.mapRoom), 'map');
  }
});
$('#map').addEventListener('focusin', event => {
  const target = event.target.closest('[data-map-room]');
  if (target && state.zoom > 1) zoomMap(Number(target.dataset.mapRoom));
});
$$('[data-zoom]').forEach(button => button.addEventListener('click', () => {
  state.zoom = button.dataset.zoom === 'reset' ? 1 : Math.min(1.8,Math.max(1,state.zoom+(button.dataset.zoom === 'in' ? .2 : -.2)));
  zoomMap();
}));
function selectTab(tab,focus) {
  state.tab = tab.dataset.tab;
  renderRoom();
  if (focus) tab.focus();
}
$$('.tabs [role=tab]').forEach((button,index,tabs) => {
  button.addEventListener('click', () => selectTab(button,false));
  button.addEventListener('keydown', event => {
    const nextIndex = {ArrowRight:(index+1)%tabs.length,ArrowLeft:(index+tabs.length-1)%tabs.length,Home:0,End:tabs.length-1}[event.key];
    if (nextIndex === undefined) return;
    event.preventDefault();
    selectTab(tabs[nextIndex],true);
  });
});
$('#room-content').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.hasAttribute('data-add')) openEditor(null);
  if (button.hasAttribute('data-edit')) openEditor(Number(button.dataset.edit));
  if (button.hasAttribute('data-art')) {
    const target = room().mobs[Number(button.dataset.art)];
    publishScene(creatureScene(target),true);
  }
  if (button.hasAttribute('data-remove')) {
    const index = Number(button.dataset.remove);
    const items = room()[state.tab];
    const [removed] = items.splice(index,1);
    saveDungeon();
    renderDesk();
    $('[data-add]').focus();
    notify('Removido da sala: ' + removed.name + '.', () => {
      items.splice(index,0,removed);
      saveDungeon();
      if (state.view === 'mesa') renderDesk();
    });
  }
});
$('#reveal-room').addEventListener('click', () => {
  state.shared.add(state.room);
  publishScene(roomScene(state.dungeon,state.shared,state.room),true);
  renderDesk();
});
$('#hide-player').addEventListener('click', () => {
  publishScene(null);
  $('#reveal-room').focus();
  notify('Projeção em espera.');
});
$('[data-preview]').addEventListener('click', openPlayers);
window.addEventListener('hashchange', () => navigate(window.location.hash.slice(1) || 'criar'));
window.addEventListener('focus',()=>{ if (state.view==='mesa') renderBroadcast(); });
if (stored) {
  const {levels,difficulty,boss,size} = stored.party;
  $('#party-count').value=levels.length;
  $('#party-level').value=levels[0];
  $('#mixed').checked=levels.some(level=>level!==levels[0]);
  state.levels=levels.slice();
  createForm.querySelector('[name=difficulty][value='+difficulty+']').checked=true;
  $('#size').value=size===difficulty?'auto':size;
  $('#boss').value=boss;
  formChanged();
  if ($('#mixed').checked) $$('#individual select').forEach((input,index)=>{input.value=levels[index];});
  formChanged({target:$('#size')});
  $('#saved').textContent='Salva neste navegador';
} else formChanged();
navigate(window.location.hash.slice(1) || (stored?'mesa':'criar'),false);
