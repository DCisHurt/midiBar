let lastA = false
let lastB = false

let lastAng = 0

let noteBuff = [-1, -1, -1, -1, -1]
let pitchBuff = [-1, -1, -1, -1, -1]

let bitDepth = 3200
let baseNote = 48
let octaveScale = 2
let lastTouch = 0
let shiftThreshold = 10
let velocity = 127
let ccReg = 2

const noteOnByte = 0x90
const noteOffByte = 0x80
const pitchBendByte = 0xE0
const midiCCByte = 0xB0
const afterTouchByte = 0xD0

serial.redirect(SerialPin.P0, SerialPin.P1, BaudRate.BaudRate31250)

Trill.init(
    TrillDevice.TRILL_BAR,
    TrillMode.AUTO,
    TrillSpeed.ULTRA_FAST,
    12,
    1,
    100
)

basic.forever(function () {
    let A = input.buttonIsPressed(Button.A)
    let B = input.buttonIsPressed(Button.B)
    let ang = pins.analogReadPin(AnalogPin.P2)
    let touch = Trill.numTouchRead()

    Trill.read()

    if (A && !lastA) {
        if (ccReg == 2) {
            ccReg = 10
        }
        else {
            ccReg--
        }
        midiCC(0, 12, 1)
    }

    if (B && !lastB) {
        if (ccReg == 10) {
            ccReg = 2
        }
        else {
            ccReg++
        }
        midiCC(0, 11, 1)
    }

    if (Math.abs(lastAng - ang) >= 2) {
        midiCC(0, ccReg, ((1024 - ang) >> 3))
    }

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
    
    for (let i = 0; i < touch; i++) {
        let brightness = Math.round(Math.map(Trill.touchSize(i), 2000, 5000, 5, 45))
        
        afterTouch(i, brightness * 3)
        setLED(i, brightness)
    }

    lastTouch = touch
    lastAng = ang
    lastA = A
    lastB = B
})

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

function note2data(note: number): number {
    return Math.round((note - baseNote) * bitDepth / (12 * octaveScale))
}

function data2note(data: number): number {
    return Math.round(data * 12 * octaveScale / bitDepth) + baseNote
}

function midiCC(ch: number, num: number, value: number): void {
    let msg = Buffer.create(3)
    msg[0] = midiCCByte | ch
    msg[1] = num
    msg[2] = value

    serial.writeBuffer(msg)
}

function noteOn(ch: number, note: number, vol: number): void {
    let msg = Buffer.create(3)
    msg[0] = noteOnByte | ch + 1
    msg[1] = note
    msg[2] = vol
    // serial.writeValue("channel", ch)
    // serial.writeValue("noteOn", note)
    serial.writeBuffer(msg)
}

function noteOff(ch: number, note: number): void {
    let msg = Buffer.create(3)
    msg[0] = noteOffByte | ch + 1
    msg[1] = note
    msg[2] = 127
    // serial.writeValue("channel", ch)
    // serial.writeValue("noteOff", note)
    led.plotBrightness(ch, 0, 0)
    led.plotBrightness(ch, 1, 0)
    led.plotBrightness(ch, 2, 0)
    led.plotBrightness(ch, 3, 0)
    led.plotBrightness(ch, 4, 0)
    serial.writeBuffer(msg)
}

function pitchBend(ch: number, shift: number): void {
    shift = Math.abs(Math.map(shift, -3200, 3200, 0, 16384))

    let msg = Buffer.create(3)
    msg[0] = pitchBendByte | ch + 1
    msg[1] = shift & 0x003F
    msg[2] = (shift - msg[1]) >> 7
    // serial.writeValue("channel", ch)
    // serial.writeValue("bend", shift)
    serial.writeBuffer(msg)
}

function afterTouch(ch: number, pressure : number): void {
    let msg = Buffer.create(2)
    msg[0] = afterTouchByte | ch + 1
    msg[1] = pressure & 0x7F

    serial.writeBuffer(msg)
}
