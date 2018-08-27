'use strict';
import io from 'socket.io-client';
import $ from 'jquery';

const canvas = $('#rader')[0];
canvas.width = 500;
canvas.height = 500;

const ctx = canvas.getContext('2d');

const x = canvas.width / 2;
const y = canvas.height / 2;
const r = canvas.width / 2;
let deg = 0;

function ticker() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save(); // セーブ

    ctx.beginPath();
    ctx.translate(x, y);
    ctx.rotate(deg * Math.PI / 180 );
    ctx.translate(-x, -y);

    /* グラデーション領域をセット */
    var grad  = ctx.createLinearGradient(x, y, x + x /3, y/3);
    /* グラデーション終点のオフセットと色をセット */
    grad.addColorStop(0,'rgba(0, 220, 0, 0)');
    grad.addColorStop(0.1,'rgba(0, 220, 0, 0)');
    //grad.addColorStop(0.9,'rgba(0, 200, 0, 0.4)');
    grad.addColorStop(1,'rgba(0, 220, 0, 0.5)');
    /* グラデーションをfillStyleプロパティにセット */
    ctx.fillStyle = grad;

    ctx.arc(x, y, r, 0 * Math.PI / 180, -45 * Math.PI / 180, true);
    ctx.lineTo(x, y);

    ctx.fill();

    ctx.restore(); // 元の設定を取得
    deg += 3;
}
setInterval(ticker, 25);
