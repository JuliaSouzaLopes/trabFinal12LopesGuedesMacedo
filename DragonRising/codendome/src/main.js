import './style.css';
import Game from './Game.js';

const canvas = document.querySelector('canvas.webgl');
// Se o seu HTML não tiver a classe .webgl, adicione ou mude o seletor aqui
// O index.html que você mandou não tinha o canvas, vou te dar o HTML correto abaixo.

const game = new Game(canvas);