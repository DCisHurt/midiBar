
serial.redirect(SerialPin.P0, SerialPin.P1, BaudRate.BaudRate31250)
pins.digitalWritePin(DigitalPin.P8, 1)

let lastA = false
let lastB = false

let noteA = 35
let noteB = 39
let velocity = 127

let lastAng = 0
let lastAng2 = 0
let channel_1 = 1
let channel_2 = 2

const noteOnByte = 0x90
const noteOffByte = 0x80
const pitchBendByte = 0xE0
const midiCCByte = 0xB0

basic.forever(function () {
    let A = input.buttonIsPressed(Button.A)
    let B = input.buttonIsPressed(Button.B)

    let ang = pins.analogReadPin(AnalogPin.P1)
    let ang2 = pins.analogReadPin(AnalogPin.P2)

    if (A && !lastA) {
        noteOn(channel_1, noteA, velocity)
        pins.digitalWritePin(DigitalPin.P8, 0)
    }
    else if (!A && lastA) {
        noteOff(channel_1, noteA)
        pins.digitalWritePin(DigitalPin.P8, 1)
    }
        
    if (B && !lastB) {
        noteOn(channel_2, noteB, velocity)
    }
    else if (!B && lastB) {
        noteOff(channel_2, noteB)
    }
    if (Math.abs(lastAng - ang) >= 2) {
        let pitch = (ang - 511) * 16
        pitchBend(channel_1, pitch)
    }
    if (Math.abs(lastAng2 - ang2) >= 2) {
        let pitch2 = (ang - 511) * 16
        pitchBend(channel_2, pitch2)
    }

    lastAng = ang
    lastAng2 = ang2
    lastA = A
    lastB = B
    basic.pause(10)
})

function midiCC(ch: number, num: number, value: number): void{
    let msg = Buffer.create(3)
    msg[0] = midiCCByte | ch
    msg[1] = num
    msg[2] = value
  
    serial.writeBuffer(msg)
}

function noteOn(ch: number, note: number, vol: number): void{
    let msgN = Buffer.create(3)
    msgN[0] = noteOnByte | ch
    msgN[1] = note
    msgN[2] = vol
  
    serial.writeBuffer(msgN)
}

function noteOff(ch: number, note: number): void{
    let msgN = Buffer.create(2)
    msgN[0] = noteOffByte | ch
    msgN[1] = note
  
    serial.writeBuffer(msgN)
}


function pitchBend(ch: number, shift: number): void{
    shift = shift + 8192

    let msg = Buffer.create(3)
    msg[0] = pitchBendByte | ch
    msg[1] = shift & 0x003F
    msg[2] = (shift - msg[1]) >> 7
  
    serial.writeBuffer(msg)
}        



// // tests go here; this will not be compiled when this package is used as an extension.

// basic
// let touchBuff: number[];
// let noteBuff: number[];

// let lastTouch = 0;

// Trill.init(
//     TrillDevice.TRILL_BAR,
//     TrillSpeed.TRILL_SPEED_ULTRA_FAST,
//     TrillMode.AUTO,
//     12,
//     1,
//     10
// ) 

// basic.forever(function () {
//     Trill.read();

//     let touch = Trill.numTouchRead();

//     if (touch <= lastTouch) {
//         for (let i = 0; i <= lastTouch; i++) {
//             for (let j = 0; j <= touch; j++) {
//                 // pitchbend update
//                 let temp = Trill.touchRead(j);
//                 if (Math.abs(temp - noteBuff[i]) < 100) {
//                     pitchBend(i, temp - noteBuff[i]);
//                     break;
//                 }
//                 // note off
//                 if (j == touch) {
//                     noteOff(i, data2note(noteBuff[i]));
//                     pitchBend(i, 0);
//                     noteBuff[i] = -1;
//                 }
//             }
//         }
//     }
//     else {
//         for (let i = 0; i <= touch; i++) {
//             let temp = Trill.touchRead(i);
//             for (let j = 0; j <= lastTouch; j++) {
//                 // pitchbend update
//                 if (Math.abs(temp - noteBuff[j]) < 100) {
//                     pitchBend(j, temp - noteBuff[j]);
//                     break;
//                 }
//                 // new note on
//                 if (j == lastTouch) {
//                     let newChannel = lastTouch + 1;
//                     noteBuff[newChannel] = note2data(data2note(temp));

//                     noteOn(newChannel, data2note(noteBuff[newChannel]), 127);
//                     pitchBend(newChannel, temp - noteBuff[newChannel]);
//                 }
//             }
//         }
//     }

//     lastTouch = touch;
// })
