
// last state of buttons, potentiometer and sensor
let lastA = false
let lastB = false
let lastAng = 0
let lastTouch = 0

// array to store the note number and pitch of each channel
let noteBuff = [-1, -1, -1, -1, -1]
let pitchBuff = [-1, -1, -1, -1, -1]

// the range of the touch sensor
let bitDepth = 3200 

// Midi message initialization
let baseNote = 48
let octaveScale = 2
let shiftThreshold = 10
let velocity = 127
let ccReg = 2

// Midi message register
const noteOnByte = 0x90
const noteOffByte = 0x80
const pitchBendByte = 0xE0
const midiCCByte = 0xB0
const afterTouchByte = 0xD0

// UART initialization
serial.redirect(SerialPin.P0, SerialPin.P1, BaudRate.BaudRate31250)

// Touch Bar initialization
Trill.init(
    TrillDevice.TRILL_BAR,
    TrillMode.AUTO,
    TrillSpeed.ULTRA_FAST,
    12,
    1,
    100
)

basic.forever(function () {
    // read the touch sensor
    Trill.read()

    // get the current state of buttons, potentiometer and sensor
    let A = input.buttonIsPressed(Button.A)
    let B = input.buttonIsPressed(Button.B)
    let ang = pins.analogReadPin(AnalogPin.P2)
    let touch = Trill.numTouchRead()

    // if buttons A pressed, send the corresponding midi message
    if (A && !lastA) {
        if (ccReg == 2) {
            ccReg = 10
        }
        else {
            ccReg--
        }
        midiCC(0, 12, 1)
    }

    // if buttons B pressed, send the corresponding midi message
    if (B && !lastB) {
        if (ccReg == 10) {
            ccReg = 2
        }
        else {
            ccReg++
        }
        midiCC(0, 11, 1)
    }

    // if potentiometer rotated, send the corresponding midi message
    if (Math.abs(lastAng - ang) >= 2) {
        midiCC(0, ccReg, ((1024 - ang) >> 3))
    }

    // all notes off when no touch
    if ((lastTouch > 0) && (touch == 0)){ 
        for (let i = 0; i < 5; i++) {
            if (noteBuff[i] > 0){
                noteOff(i, data2note(noteBuff[i]))
            }
        }
        noteBuff = [-1, -1, -1, -1, -1]
        pitchBuff = [-1, -1, -1, -1, -1]
    }
    else if (touch < lastTouch) {
        for (let i = 0; i < lastTouch; i++) {
            for (let j = 0; j < touch; j++) {
                // pitchbend update
                let temp = Trill.touchCoordinate(j)
                if ((Math.abs(temp - noteBuff[i] + pitchBuff[i]) < 200) && (Math.abs(temp - noteBuff[i] - pitchBuff[i]) > shiftThreshold)) {
                    pitchBuff[i] = temp - noteBuff[i]
                    pitchBend(i, pitchBuff[i])
                    break
                }
                // note off
                if (j == touch) {
                    if (noteBuff[i] > 0){
                        noteOff(i, data2note(noteBuff[i]))
                        pitchBend(i, 0)
                        noteBuff[i] = -1
                        pitchBuff[i] = 0
                    }
                }
            }
        }
    }
    else if (touch == lastTouch){
        for (let i = 0; i < lastTouch; i++) {
            for (let j = 0; j < touch; j++) {
                // pitchbend update
                let temp = Trill.touchCoordinate(j)
                if ((Math.abs(temp - noteBuff[i] - pitchBuff[i]) < 200) && (Math.abs(temp - noteBuff[i] - pitchBuff[i]) > shiftThreshold)) {
                    pitchBuff[i] = temp - noteBuff[i]
                    pitchBend(i, pitchBuff[i])
                    break
                }
            }
        }
    }
    else {
        for (let i = 0; i < touch; i++) {
            let temp = Trill.touchCoordinate(i)
            if (lastTouch == 0){
                noteBuff[i] = temp
                noteOn(i, data2note(temp), velocity)
            }
            else{
                for (let j = 0; j < lastTouch; j++) {
                    // pitchbend update
                    if ((Math.abs(temp - noteBuff[j] + pitchBuff[j]) < 200) && (Math.abs(temp - noteBuff[j] - pitchBuff[j]) > shiftThreshold)) {
                        pitchBuff[j] = temp - noteBuff[j]
                        pitchBend(j, pitchBuff[j])
                        break
                    }
                    // new note on
                    if (j == (lastTouch - 1)) {
                        if(noteBuff[i] < 0){
                            noteBuff[i] = temp
                            noteOn(i, data2note(temp), velocity)
                            pitchBend(i, temp - noteBuff[i])
                        }
                    }
                }
            }
        }
    }
    
    // update the LED brightness and touch velocity
    for (let i = 0; i < touch; i++) {
        let brightness = Math.round(Math.map(Trill.touchSize(i), 2000, 5000, 5, 45))
        
        afterTouch(i, brightness * 3)
        setLED(i, brightness)
    }

    // update the last state
    lastTouch = touch
    lastAng = ang
    lastA = A
    lastB = B
})

// set LED brightness accrording to the touch velocity
function setLED(ch: number, brightness: number): void {
 
    for (let i = 4; i >= 0; i--) {
        if (brightness >= 8){
            led.plotBrightness(ch, i, 128)
        }
        else{
            led.plotBrightness(ch, i, brightness*16)
        }
        brightness -= 8
    }
}

// convert the note number to the data number
function note2data(note: number): number {
    return Math.round((note - baseNote) * bitDepth / (12 * octaveScale))
}

// convert the data number to the note number
function data2note(data: number): number {
    return Math.round(data * 12 * octaveScale / bitDepth) + baseNote
}

// send the midi control message
function midiCC(ch: number, num: number, value: number): void {
    let msg = Buffer.create(3)
    msg[0] = midiCCByte | ch
    msg[1] = num
    msg[2] = value

    serial.writeBuffer(msg)
}

// send the midi note on message
function noteOn(ch: number, note: number, vol: number): void {
    let msg = Buffer.create(3)
    msg[0] = noteOnByte | ch + 1
    msg[1] = note
    msg[2] = vol

    serial.writeBuffer(msg)
}

// send the midi note off message
function noteOff(ch: number, note: number): void {
    let msg = Buffer.create(3)
    msg[0] = noteOffByte | ch + 1
    msg[1] = note
    msg[2] = 127

    led.plotBrightness(ch, 0, 0)
    led.plotBrightness(ch, 1, 0)
    led.plotBrightness(ch, 2, 0)
    led.plotBrightness(ch, 3, 0)
    led.plotBrightness(ch, 4, 0)
    serial.writeBuffer(msg)
}

// send the midi pitchbend message
function pitchBend(ch: number, shift: number): void {
    shift = Math.abs(Math.map(shift, -3200, 3200, 0, 16384))

    let msg = Buffer.create(3)
    msg[0] = pitchBendByte | ch + 1
    msg[1] = shift & 0x003F
    msg[2] = (shift - msg[1]) >> 7

    serial.writeBuffer(msg)
}

// send the midi aftertouch message
function afterTouch(ch: number, pressure : number): void {
    let msg = Buffer.create(2)
    msg[0] = afterTouchByte | ch + 1
    msg[1] = pressure & 0x7F

    serial.writeBuffer(msg)
}
