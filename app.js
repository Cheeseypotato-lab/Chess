/* Chess Arena PWA. Rules are provided by chess.js; bot moves by Stockfish UCI worker. */
const game = new Chess();
const boardEl=document.getElementById('board'),statusEl=document.getElementById('gameStatus'),historyEl=document.getElementById('history');
const engineStatus=document.getElementById('engineStatus'),modeEl=document.getElementById('mode'),eloEl=document.getElementById('elo'),eloValue=document.getElementById('eloValue');
const openingEl=document.getElementById('opening'),playOpening=document.getElementById('playOpening');
let flipped=false,selected=null,legalTargets=[],engine=null,engineReady=false,engineBusy=false,playerColor='w',pendingPromotion=null,lastMove=null,installPrompt=null;
const pieceGlyph={wk:'♔',wq:'♕',wr:'♖',wb:'♗',wn:'♘',wp:'♙',bk:'♚',bq:'♛',br:'♜',bb:'♝',bn:'♞',bp:'♟'};
const files='abcdefgh';
function squareName(r,c){return files[c]+(8-r)}
function render(){
 boardEl.innerHTML='';
 const rows=Array.from({length:8},(_,i)=>i),cols=Array.from({length:8},(_,i)=>i);
 if(flipped){rows.reverse();cols.reverse()}
 const legal=selected?game.moves({square:selected,verbose:true}):[];
 for(const r of rows)for(const c of cols){
  const name=squareName(r,c),piece=game.get(name),btn=document.createElement('button');
  btn.className='square '+(((r+c)%2===0)?'light':'dark');
  if(selected===name)btn.classList.add('selected');
  if(lastMove&&(lastMove.from===name||lastMove.to===name))btn.classList.add('last');
  if(legal.some(m=>m.to===name))btn.classList.add(piece?'capture':'legal');
  if(piece){btn.textContent=pieceGlyph[piece.color+piece.type];btn.classList.add(piece.color==='w'?'white-piece':'black-piece')}
  if((!flipped&&r===7)||(flipped&&r===0)){const coord=document.createElement('span');coord.className='coord';coord.textContent=files[c];btn.appendChild(coord)}
  if((!flipped&&c===0)||(flipped&&c===7)){const coord=document.createElement('span');coord.className='coord';coord.style.left='auto';coord.style.right='4px';coord.textContent=8-r;btn.appendChild(coord)}
  btn.setAttribute('aria-label',name+(piece?' '+piece.color+' '+piece.type:' empty'));
  btn.addEventListener('click',()=>onSquare(name));boardEl.appendChild(btn);
 }
 updateInfo();
}
function updateInfo(){
 const turn=game.turn()==='w'?'White':'Black';
 statusEl.textContent=game.in_checkmate()?'Checkmate':game.in_stalemate()?'Stalemate':game.in_draw()?'Draw':turn+' to move'+(game.in_check()?' · Check':'');
 document.getElementById('turnLabel').textContent=game.game_over()?'GAME OVER':game.turn()==='w'?'YOUR MOVE':'COMPUTER THINKING';
 document.getElementById('moveCount').textContent=game.history().length+' half-moves';
 const hist=game.history();
 if(!hist.length)historyEl.textContent='No moves yet.';
 else{historyEl.innerHTML='';for(let i=0;i<hist.length;i+=2){const pair=document.createElement('span');pair.className='move-pair';pair.innerHTML='<strong>'+(Math.floor(i/2)+1)+'.</strong> '+hist[i]+(hist[i+1]?' '+hist[i+1]:'');historyEl.appendChild(pair)}}
 document.getElementById('undoBtn').disabled=hist.length===0||engineBusy;
}
function onSquare(name){
 if(game.game_over()||engineBusy||game.turn()!==playerColor)return;
 const piece=game.get(name);
 if(selected){
  const candidates=game.moves({square:selected,verbose:true}).filter(m=>m.to===name);
  if(candidates.length){
   const promotion=candidates.find(m=>m.flags.includes('p'));
   if(promotion){pendingPromotion={from:selected,to:name};document.getElementById('promotion').classList.remove('hidden');return}
   makeMove({from:selected,to:name});return;
  }
 }
 if(piece&&piece.color===playerColor){selected=name;render()}else{selected=null;render()}
}
document.querySelectorAll('[data-piece]').forEach(btn=>btn.addEventListener('click',()=>{
 if(!pendingPromotion)return;makeMove({...pendingPromotion,promotion:btn.dataset.piece});pendingPromotion=null;document.getElementById('promotion').classList.add('hidden');
}));
function makeMove(move){
 const result=game.move(move);selected=null;lastMove=result?{from:result.from,to:result.to}:null;render();
 if(result&&!game.game_over()&&game.turn()==='b'){populateOpeningChoices();engineStatus.textContent='YOUR CHOICE · BOT MOVE';}
}
function startEngine(){
 try{
  // Stockfish 16 browser worker distribution. Requires network access on first load.
  engine=new Worker('https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish.js');
  engine.onmessage=e=>handleEngineMessage(String(e.data));
  engine.onerror=()=>{engineStatus.textContent='Engine unavailable';engineReady=false};
  engine.postMessage('uci');
 }catch(e){engineStatus.textContent='Engine unavailable'}
}
function handleEngineMessage(msg){
 if(msg==='uciok'){engine.postMessage('isready');return}
 if(msg==='readyok'){engineReady=true;engineStatus.textContent='ENGINE READY';return}
 if(msg.startsWith('bestmove')){
  engineBusy=false;const uci=msg.split(/\s+/)[1];
  if(uci&&uci!=='(none)'){
   const move={from:uci.slice(0,2),to:uci.slice(2,4)};
   if(uci.length>4)move.promotion=uci[4];
   const made=game.move(move);
   if(made)lastMove={from:made.from,to:made.to};
  }
  render();populateOpeningChoices();return;
 }
}
function botMove(){
 if(game.game_over()||game.turn()!=='b')return;
 if(!engineReady){engineStatus.textContent='Waiting for engine';return}
 engineBusy=true;engineStatus.textContent='THINKING…';render();
 const elo=Number(eloEl.value),mode=modeEl.value;
 engine.postMessage('ucinewgame');engine.postMessage('setoption name UCI_LimitStrength value '+(mode==='max'?'false':'true'));
 if(mode!=='max')engine.postMessage('setoption name UCI_Elo value '+Math.min(elo,3190));
 engine.postMessage('position fen '+game.fen());
 if(mode==='mate')engine.postMessage('go mate 8');
 else engine.postMessage('go depth '+(mode==='max'?28:18));
}
function populateOpeningChoices(){
 openingEl.innerHTML='';
 if(game.turn()!=='b'||game.game_over()){openingEl.add(new Option('Play a move as White first',''));openingEl.disabled=true;playOpening.disabled=true;document.getElementById('autoBot').disabled=true;return}
 const moves=game.moves({verbose:true});
 openingEl.add(new Option('Choose the bot\'s reply…',''));
 moves.forEach(m=>openingEl.add(new Option(m.san+' ('+m.from+'–'+m.to+')',m.from+m.to+(m.promotion||''))));
 openingEl.disabled=false;playOpening.disabled=false;document.getElementById('autoBot').disabled=false;
}
playOpening.addEventListener('click',()=>{
 const u=openingEl.value;if(!u||game.turn()!=='b')return;
 const made=game.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]||'q'});
 if(made){lastMove={from:made.from,to:made.to};render();populateOpeningChoices();}
});
document.getElementById('autoBot').addEventListener('click',()=>botMove());
document.getElementById('undoBtn').addEventListener('click',()=>{
 if(engineBusy)return;game.undo();if(game.turn()==='b')game.undo();lastMove=null;selected=null;render();populateOpeningChoices();
});
document.getElementById('newBtn').addEventListener('click',()=>{game.reset();selected=null;lastMove=null;engineBusy=false;render();populateOpeningChoices()});
document.getElementById('flipBtn').addEventListener('click',()=>{flipped=!flipped;render()});
eloEl.addEventListener('input',()=>eloValue.value=eloEl.value);
modeEl.addEventListener('change',()=>{if(modeEl.value==='max'){eloEl.value=3200}else if(modeEl.value==='hard'){eloEl.value=2000}else{eloEl.value=1800}eloValue.value=eloEl.value});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;document.getElementById('installBtn').classList.remove('hidden')});
document.getElementById('installBtn').addEventListener('click',async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null});
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
render();populateOpeningChoices();startEngine();
