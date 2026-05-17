const programLPD = (options)=>{
  let msg = [0xF0,0x47,0x7F,0x4C]
  msg.push(0x01, 0x01, 0x29) //write, ?, ?
  msg.push(options.num < 4 ? options.num : 0)
  msg.push(0x00, 0x00, 0x00, 0x00) //global channel, pressure, full level, toggle

  for(let i=0;i<8;i++){
    let pad = [options.note+i, options.pc+i, options.cc+i,0x09]
    for(let k=0;k<3;k++) pad.push(0x00,options.colorOn[k])
    for(let k=0;k<3;k++) pad.push(0x00,options.colorOff[k])
    msg.push(...pad)
  }
  for(let i=0;i<8;i++){
    let cc = [options.cc+64+i, 0x00, 0, 127]
    msg.push(...cc)
  }
  msg.push(0xF7)
  return msg
}

let msg = programLPD({num:1, note:24, cc:0, pc:0, colorOn:[100,100,100], colorOff:[40,0,40]})
let msg = programLPD({num:2, note:36, cc:8, pc:8, colorOn:[0,100,100], colorOff:[0,0,40]})
let msg = programLPD({num:3, note:48, cc:16, pc:16, colorOn:[100,0,100], colorOff:[40,0,0]})
let msg = programLPD({num:4, note:60, cc:24, pc:0, colorOn:[100,100,0], colorOff:[0,40,40]})

//FOR LPD8
let setLedLpd = (ledNum, [r, g, b]) => {
  // Header
  let msg = [0xF0, 0x47, 0x7F, 0x4C, 0x06, 0x00, 0x30];

  for (let i = 0; i < 8; i++) {
    if (ledNum === i) {
      msg.push(0x00, r, 0x00, g, 0x00, b);
    } else {
      msg.push(0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
    }
  }
  msg.push(0xF7);
  return msg;
};
let msg = setLedLpd(1, [0x7F, 0x77, 0x00]);
