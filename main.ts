/*
load dependency
"robotbit": "file:../pxt-robotbit"
*/

//% color="#31C7D5" weight=10 icon="\uf1d0"
namespace < LAB_CODE > {

  ///  const PCA9685_ADDRESS = 0x40
  //  const MODE1 = 0x00
  //  const MODE2 = 0x01
   // const SUBADR1 = 0x02
    //const SUBADR2 = 0x03
   // const SUBADR3 = 0x04
  //  const PRESCALE = 0xFE
  //  const LED0_ON_L = 0x06
 ///   const LED0_ON_H = 0x07
  //  const LED0_OFF_L = 0x08
   // const LED0_OFF_H = 0x09
  //  const ALL_LED_ON_L = 0xFA
    //const ALL_LED_ON_H = 0xFB
  //  const ALL_LED_OFF_L = 0xFC
  //  const ALL_LED_OFF_H = 0xFD

 //   const STP_CHA_L = 2047
  //  const STP_CHA_H = 4095

 //   const STP_CHB_L = 1
 //   const STP_CHB_H = 2047

// const STP_CHC_L = 1023
 //   const STP_CHC_H = 3071

//    const STP_CHD_L = 3071
//    const STP_CHD_H = 1023

    // HT16K33 commands
  //  const HT16K33_ADDRESS = 0x70
  //  const HT16K33_BLINK_CMD = 0x80
 //   const HT16K33_BLINK_DISPLAYON = 0x01
   // const HT16K33_BLINK_OFF = 0
 //   const HT16K33_BLINK_2HZ = 1
    //const HT16K33_BLINK_1HZ = 2
    //\\const HT16K33_BLINK_HALFHZ = 3
  //const HT16K33_CMD_BRIGHTNESS = 0xE0
   
    export enum Servos {
        S1 = 0x01,
        S2 = 0x02,
        S3 = 0x03,
        S4 = 0x04,
        S5 = 0x05,
        S6 = 0x06,
        S7 = 0x07,
        S8 = 0x08
}

export enum Motors {
    M1A = 0x1,
    M1B = 0x2,
    M2A = 0x3,
    M2B = 0x4
}

export enum Steppers {
    M1 = 0x1,
    M2 = 0x2
}

export enum SonarVersion {
    V1 = 0x1,
    V2 = 0x2
}

export enum Turns {
    //% blockId="T1B4" block="1/4"
    T1B4 = 90,
    //% blockId="T1B2" block="1/2"
    T1B2 = 180,
    //% blockId="T1B0" block="1"
    T1B0 = 360,
    //% blockId="T2B0" block="2"
    T2B0 = 720,
    //% blockId="T3B0" block="3"
    T3B0 = 1080,
    //% blockId="T4B0" block="4"
    T4B0 = 1440,
    //% blockId="T5B0" block="5"
    T5B0 = 1800
}

export enum ValueUnit {
    //% block="mm"
    Millimetros,
    //% block="cm"
    Centimetros
}

let initialized = false
let initializedMatrix = false
let neoStrip: neopixel.Strip;
let matBuf = pins.createBuffer(17);
let distanceBuf = 0;

function i2cwrite(addr: number, reg: number, value: number) {
    let buf = pins.createBuffer(2)
    buf[0] = reg
    buf[1] = value
    pins.i2cWriteBuffer(addr, buf)
}

function i2ccmd(addr: number, value: number) {
    let buf = pins.createBuffer(1)
    buf[0] = value
    pins.i2cWriteBuffer(addr, buf)
}

function i2cread(addr: number, reg: number) {
    pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
    let val = pins.i2cReadNumber(addr, NumberFormat.UInt8BE);
    return val;
}

function initPCA9685(): void {
    i2cwrite(PCA9685_ADDRESS, MODE1, 0x00)
    setFreq(50);
    for (let idx = 0; idx < 16; idx++) {
        setPwm(idx, 0, 0);
    }
    initialized = true
}

function setFreq(freq: number): void {
    // Constrain the frequency
    let prescaleval = 25000000;
    prescaleval /= 4096;
    prescaleval /= freq;
    prescaleval -= 1;
    let prescale = prescaleval; //Math.Floor(prescaleval + 0.5);
    let oldmode = i2cread(PCA9685_ADDRESS, MODE1);
    let newmode = (oldmode & 0x7F) | 0x10; // sleep
    i2cwrite(PCA9685_ADDRESS, MODE1, newmode); // go to sleep
    i2cwrite(PCA9685_ADDRESS, PRESCALE, prescale); // set the prescaler
    i2cwrite(PCA9685_ADDRESS, MODE1, oldmode);
    control.waitMicros(5000);
    i2cwrite(PCA9685_ADDRESS, MODE1, oldmode | 0xa1);
}

function setPwm(channel: number, on: number, off: number): void {
    if (channel < 0 || channel > 15)
        return;
    //serial.writeValue("ch", channel)
    //serial.writeValue("on", on)
    //serial.writeValue("off", off)

    let buf = pins.createBuffer(5);
    buf[0] = LED0_ON_L + 4 * channel;
    buf[1] = on & 0xff;
    buf[2] = (on >> 8) & 0xff;
    buf[3] = off & 0xff;
    buf[4] = (off >> 8) & 0xff;
    pins.i2cWriteBuffer(PCA9685_ADDRESS, buf);
}


function setStepper(index: number, dir: boolean): void {
    if (index == 1) {
        if (dir) {
            setPwm(0, STP_CHA_L, STP_CHA_H);
            setPwm(2, STP_CHB_L, STP_CHB_H);
            setPwm(1, STP_CHC_L, STP_CHC_H);
            setPwm(3, STP_CHD_L, STP_CHD_H);
        } else {
            setPwm(3, STP_CHA_L, STP_CHA_H);
            setPwm(1, STP_CHB_L, STP_CHB_H);
            setPwm(2, STP_CHC_L, STP_CHC_H);
            setPwm(0, STP_CHD_L, STP_CHD_H);
        }
    } else {
        if (dir) {
            setPwm(4, STP_CHA_L, STP_CHA_H);
            setPwm(6, STP_CHB_L, STP_CHB_H);
            setPwm(5, STP_CHC_L, STP_CHC_H);
            setPwm(7, STP_CHD_L, STP_CHD_H);
        } else {
            setPwm(7, STP_CHA_L, STP_CHA_H);
            setPwm(5, STP_CHB_L, STP_CHB_H);
            setPwm(6, STP_CHC_L, STP_CHC_H);
            setPwm(4, STP_CHD_L, STP_CHD_H);
        }
    }
}

function stopMotor(index: number) {
    setPwm((index - 1) * 2, 0, 0);
    setPwm((index - 1) * 2 + 1, 0, 0);
}

function matrixInit() {
    i2ccmd(HT16K33_ADDRESS, 0x21);// turn on oscillator
    i2ccmd(HT16K33_ADDRESS, HT16K33_BLINK_CMD | HT16K33_BLINK_DISPLAYON | (0 << 1));
    i2ccmd(HT16K33_ADDRESS, HT16K33_CMD_BRIGHTNESS | 0xF);
}

function matrixShow() {
    matBuf[0] = 0x00;
    pins.i2cWriteBuffer(HT16K33_ADDRESS, matBuf);
}


/**
 * Init RGB pixels mounted on robotbit
 */
//% blockId="robotbit_rgb" block="RGB"
//% weight=70
export function rgb(): neopixel.Strip {
    if (!neoStrip) {
        neoStrip = neopixel.create(DigitalPin.P16, 4, NeoPixelMode.RGB)
    }

    return neoStrip;
}

/**
 * Servo Execute
 * @param index Servo Channel; eg: S1
 * @param degree [0-180] degree of servo; eg: 0, 90, 180
*/
//% blockId=robotbit_servo block="Servo|%index| ângulo %degree"
//% group="Servo" weight=62
//% degree.min=0 degree.max=180
//% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
export function Servo(index: Servos, degree: number): void {
    if (!initialized) {
        initPCA9685()
    }
    // 50hz: 20,000 us
    let v_us = (degree * 1800 / 180 + 600) // 0.6 ~ 2.4
    let value = v_us * 4096 / 20000
    setPwm(index + 7, 0, value)
}

/**
 * Geek Servo
 * @param index Servo Channel; eg: S1
 * @param degree [-45-225] degree of servo; eg: -45, 90, 225
*/
//% blockId=robotbit_gservo block="Geek Servo|%index| ângulo %degree"
///% group="Servo" weight=61
//% degree.min=-45 degree.max=225
//% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
export function GeekServo(index: Servos, degree: number): void {
    if (!initialized) {
        initPCA9685()
    }
    // 50hz: 20,000 us
    let v_us = ((degree - 90) * 20 / 3 + 1500) // 0.6 ~ 2.4
    let value = v_us * 4096 / 20000
    setPwm(index + 7, 0, value)
}

/**
* GeekServo2KG
* @param index Servo Channel; eg: S1
* @param degree [0-360] degree of servo; eg: 0, 180, 360
*/
//% blockId=robotbit_gservo2kg block="GeekServo2KG|%index|ângulo %degree"
//% group="Servo" weight=60
//% blockGap=50
//% degree.min=0 degree.max=360
//% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
export function GeekServo2KG(index: Servos, degree: number): void {
    if (!initialized) {
        initPCA9685()
    }
    // 50hz: 20,000 us
    //let v_us = (degree * 2000 / 360 + 500)  0.5 ~ 2.5
    let v_us = (Math.floor((degree) * 2000 / 350) + 500) //fixed
    let value = v_us * 4096 / 20000
    setPwm(index + 7, 0, value)
}

/**
* GeekServo5KG
* @param index Servo Channel; eg: S1
* @param degree [0-360] degree of servo; eg: 0, 180, 360
*/
//% blockId=robotbit_gservo5kg block="GeekServo5KG|%index|ângulo %degree"
//% group="Servo" weight=59
//% degree.min=0 degree.max=360
//% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
export function GeekServo5KG(index: Servos, degree: number): void {
    if (!initialized) {
        initPCA9685()
    }
    const minInput = 0;
    const maxInput = 355;//理论值为360
    const minOutput = 500;
    const maxOutput = 2500;
    const v_us = ((degree - minInput) / (maxInput - minInput)) * (maxOutput - minOutput) + minOutput;

    let value = v_us * 4096 / 20000
    setPwm(index + 7, 0, value)
}

//% blockId=robotbit_gservo5kg_motor block="GeekServo5KG_MotorEN|%index|Velocidade %speed"
//% group="Servo" weight=58
//% speed.min=-255 speed.max=255
//% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
export function GeekServo5KG_Motor(index: Servos, speed: number): void { //5KG的电机模式 3000-5000 4000是回中
    if (!initialized) {
        initPCA9685()
    }
    const minInput = -255;
    const maxInput = 255;
    const minOutput = 5000;
    const maxOutput = 3000;

    const v_us = ((speed - minInput) / (maxInput - minInput)) * (maxOutput - minOutput) + minOutput;
    let value = v_us * 4096 / 20000
    setPwm(index + 7, 0, value)
}


//% blockId=robotbit_stepper_degree block="Stepper 28BYJ-48|%index|ângulo %degree"
//% group="Motores" weight=54
export function StepperDegree(index: Steppers, degree: number): void {
    if (!initialized) {
        initPCA9685()
    }
    setStepper(index, degree > 0);
    degree = Math.abs(degree);
    basic.pause(10240 * degree / 360);
    MotorStopAll()
}


//% blockId=robotbit_stepper_turn block="Stepper 28BYJ-48|%index|turn %turn"
//% group="Motores" weight=53
export function StepperTurn(index: Steppers, turn: Turns): void {
    let degree = turn;
    StepperDegree(index, degree);
}

//% blockId=robotbit_stepper_dual block="Passo duplo (grau) |M1 %degree1| M2 %degree2"
//% group="Motores" weight=52
export function StepperDual(degree1: number, degree2: number): void {
    if (!initialized) {
        initPCA9685()
    }
    setStepper(1, degree1 > 0);
    setStepper(2, degree2 > 0);
    degree1 = Math.abs(degree1);
    degree2 = Math.abs(degree2);
    basic.pause(10240 * Math.min(degree1, degree2) / 360);
    if (degree1 > degree2) {
        stopMotor(3); stopMotor(4);
        basic.pause(10240 * (degree1 - degree2) / 360);
    } else {
        stopMotor(1); stopMotor(2);
        basic.pause(10240 * (degree2 - degree1) / 360);
    }

    MotorStopAll()
}

/**
 * Stepper Car move forward
 * @param distance Distance to move in cm; eg: 10, 20
 * @param diameter diameter of wheel in mm; eg: 48
*/
//% blockId=robotbit_stpcar_move block="Carro para frente|Distância (cm) %distance|Wheel Diâmetro(mm) %diameter"
//% group="Motores" weight=51
export function StpCarMove(distance: number, diameter: number): void {
    if (!initialized) {
        initPCA9685()
    }
    let delay = 10240 * 10 * distance / 3 / diameter; // use 3 instead of pi
    setStepper(1, delay > 0);
    setStepper(2, delay > 0);
    delay = Math.abs(delay);
    basic.pause(delay);
    MotorStopAll()
}

/**
 * Stepper Car turn by degree
 * @param turn Degree to turn; eg: 90, 180, 360
 * @param diameter diameter of wheel in mm; eg: 48
 * @param track track width of car; eg: 125
*/
//% blockId=robotbit_stpcar_turn block="Turno do carro|Velocidade %turn|Diâmetro da roda(omm) %diameter|trajeto(mm) %track"
//% group="Motores" weight=50
//% blockGap=50
export function StpCarTurn(turn: number, diameter: number, track: number): void {
    if (!initialized) {
        initPCA9685()
    }
    let delay = 10240 * turn * track / 360 / diameter;
    setStepper(1, delay < 0);
    setStepper(2, delay > 0);
    delay = Math.abs(delay);
    basic.pause(delay);
    MotorStopAll()
}

//% blockId=robotbit_motor_run block="Motor|%index|velocidade %speed"
//% group="Motores" weight=59
//% speed.min=-255 speed.max=255
//% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
export function MotorRun(index: Motors, speed: number): void {
    if (!initialized) {
        initPCA9685()
    }
    speed = speed * 16; // map 255 to 4096
    if (speed >= 4096) {
        speed = 4095
    }
    if (speed <= -4096) {
        speed = -4095
    }
    if (index > 4 || index <= 0)
        return
    let pp = (index - 1) * 2
    let pn = (index - 1) * 2 + 1
    if (speed >= 0) {
        setPwm(pp, 0, speed)
        setPwm(pn, 0, 0)
    } else {
        setPwm(pp, 0, 0)
        setPwm(pn, 0, -speed)
    }
}


/**
 * Execute two motors at the same time
 * @param motor1 First Motor; eg: M1A, M1B
 * @param speed1 [-255-255] speed of motor; eg: 150, -150
 * @param motor2 Second Motor; eg: M2A, M2B
 * @param speed2 [-255-255] speed of motor; eg: 150, -150
*/
//% blockId=robotbit_motor_dual block="Motores|%motor1|velocidade %speed1|%motor2|velocidade %speed2"
//% group="Motores" weight=58
//% speed1.min=-255 speed1.max=255
//% speed2.min=-255 speed2.max=255
//% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
export function MotorRunDual(motor1: Motors, speed1: number, motor2: Motors, speed2: number): void {
    MotorRun(motor1, speed1);
    MotorRun(motor2, speed2);
}

/**
 * Execute single motors with delay
 * @param index Motor Index; eg: M1A, M1B, M2A, M2B
 * @param speed [-255-255] speed of motor; eg: 150, -150
 * @param delay seconde delay to stop; eg: 1
*/
//% blockId=robotbit_motor_rundelay block="Motor|%index|velocidade %speed|espera %delay|s"
//% group="Motores" weight=57
//% speed.min=-255 speed.max=255
//% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
export function MotorRunDelay(index: Motors, speed: number, delay: number): void {
    MotorRun(index, speed);
    basic.pause(delay * 1000);
    MotorRun(index, 0);
}



//% blockId=robotbit_stop block="Motor stop|%index|"
//% group="Motores" weight=56
export function MotorStop(index: Motors): void {
    MotorRun(index, 0);
}

//% blockId=robotbit_stop_all block="Parando todos os motores"
//% group="Motores" weight=55
//% blockGap=50
export function MotorStopAll(): void {
    if (!initialized) {
        initPCA9685()
    }
    for (let idx = 1; idx <= 4; idx++) {
        stopMotor(idx);
    }
}

//% blockId=robotbit_matrix_draw block="Matrix Draw|X %x|Y %y"
//% group="Modules" weight=44
export function MatrixDraw(x: number, y: number): void {
    if (!initializedMatrix) {
        matrixInit();
        initializedMatrix = true;
    }
    x = Math.round(x)
    y = Math.round(y)

    let idx = y * 2 + Math.idiv(x, 8);

    let tmp = matBuf[idx + 1];
    tmp |= (1 << (x % 8));
    matBuf[idx + 1] = tmp;
}

//% blockId=robotbit_matrix_refresh block="Matrix Refresh"
//% group="Modules" weight=43
export function MatrixRefresh(): void {
    if (!initializedMatrix) {
        matrixInit();
        initializedMatrix = true;
    }
    matrixShow();
}

/*
//% blockId=robotbit_matrix_clean block="Matrix Clean|X %x|Y %y"
//% group="Servo" weight=68
export function MatrixClean(x: number, y: number): void {
    if (!initializedMatrix) {
        matrixInit();
        initializedMatrix = true;
    }
    let idx = y * 2 + x / 8;
    // todo: bitwise not throw err 
    matBuf[idx + 1] &=~(1 << (x % 8));
    matrixShow();
}
*/

//% blockId=robotbit_matrix_clear block="Matrix Clear"
//% group="Modules" weight=42
//% blockGap=50
export function MatrixClear(): void {
    if (!initializedMatrix) {
        matrixInit();
        initializedMatrix = true;
    }
    for (let i = 0; i < 16; i++) {
        matBuf[i + 1] = 0;
    }
    matrixShow();
}

const MICROBIT_MAKERBIT_ULTRASONIC_OBJECT_DETECTED_ID = 798;
const MAX_ULTRASONIC_TRAVEL_TIME = 300 * DistanceUnit.CM;
const ULTRASONIC_MEASUREMENTS = 3;

interface UltrasonicRoundTrip {
    ts: number;
    rtt: number;
}

interface UltrasonicDevice {
    trig: DigitalPin | undefined;
    roundTrips: UltrasonicRoundTrip[];
    medianRoundTrip: number;
    travelTimeObservers: number[];
}

let ultrasonicState: UltrasonicDevice;

/**
 * Configures the ultrasonic distance sensor and measures continuously in the background.
 * @param trig pin connected to trig, eg: DigitalPin.P5
 * @param echo pin connected to echo, eg: DigitalPin.P8
 */
//% subcategory="Ultrasonic"
//% blockId="makerbit_ultrasonic_connect"
//% block="connect ultrasonic distance sensor | with Trig at %trig | and Echo at %echo"
//% trig.fieldEditor="gridpicker"
//% trig.fieldOptions.columns=4
//% trig.fieldOptions.tooltips="false"
//% echo.fieldEditor="gridpicker"
//% echo.fieldOptions.columns=4
//% echo.fieldOptions.tooltips="false"
//% weight=80
export function connectUltrasonicDistanceSensor(
    trig: DigitalPin,
    echo: DigitalPin
): void {
    if (ultrasonicState && ultrasonicState.trig) {
        return;
    }

    if (!ultrasonicState) {
        ultrasonicState = {
            trig: trig,
            roundTrips: [{ ts: 0, rtt: MAX_ULTRASONIC_TRAVEL_TIME }],
            medianRoundTrip: MAX_ULTRASONIC_TRAVEL_TIME,
            travelTimeObservers: [],
        };
    } else {
        ultrasonicState.trig = trig;
    }

    pins.onPulsed(echo, PulseValue.High, () => {
        if (
            pins.pulseDuration() < MAX_ULTRASONIC_TRAVEL_TIME &&
            ultrasonicState.roundTrips.length <= ULTRASONIC_MEASUREMENTS
        ) {
            ultrasonicState.roundTrips.push({
                ts: input.runningTime(),
                rtt: pins.pulseDuration(),
            });
        }
    });

    control.inBackground(measureInBackground);
}

/**
 * Do something when an object is detected the first time within a specified range.
 * @param distance distance to object, eg: 20
 * @param unit unit of distance, eg: DistanceUnit.CM
 * @param handler body code to run when the event is raised
 */
//% subcategory="Ultrasonic"
//% blockId=makerbit_ultrasonic_on_object_detected
//% block="on object detected once within | %distance | %unit"
//% weight=69
export function onUltrasonicObjectDetected(
    distance: number,
    unit: DistanceUnit,
    handler: () => void
) {
    if (distance <= 0) {
        return;
    }

    if (!ultrasonicState) {
        ultrasonicState = {
            trig: undefined,
            roundTrips: [{ ts: 0, rtt: MAX_ULTRASONIC_TRAVEL_TIME }],
            medianRoundTrip: MAX_ULTRASONIC_TRAVEL_TIME,
            travelTimeObservers: [],
        };
    }

    const travelTimeThreshold = Math.imul(distance, unit);

    ultrasonicState.travelTimeObservers.push(travelTimeThreshold);

    control.onEvent(
        MICROBIT_MAKERBIT_ULTRASONIC_OBJECT_DETECTED_ID,
        travelTimeThreshold,
        () => {
            handler();
        }
    );
}

/**
 * Returns the distance to an object in a range from 1 to 300 centimeters or up to 118 inch.
 * The maximum value is returned to indicate when no object was detected.
 * -1 is returned when the device is not connected.
 * @param unit unit of distance, eg: DistanceUnit.CM
 */
//% subcategory="Ultrasonic"
//% blockId="makerbit_ultrasonic_distance"
//% block="ultrasonic distance in %unit"
//% weight=60
export function getUltrasonicDistance(unit: DistanceUnit): number {
    if (!ultrasonicState) {
        return -1;
    }
    basic.pause(0); // yield to allow background processing when called in a tight loop
    return Math.idiv(ultrasonicState.medianRoundTrip, unit);
}

/**
 * Returns `true` if an object is within the specified distance. `false` otherwise.
 *
 * @param distance distance to object, eg: 20
 * @param unit unit of distance, eg: DistanceUnit.CM
 */
//% subcategory="Ultrasonic"
//% blockId="makerbit_ultrasonic_less_than"
//% block="ultrasonic distance is less than | %distance | %unit"
//% weight=50
export function isUltrasonicDistanceLessThan(
    distance: number,
    unit: DistanceUnit
): boolean {
    if (!ultrasonicState) {
        return false;
    }
    basic.pause(0); // yield to allow background processing when called in a tight loop
    return Math.idiv(ultrasonicState.medianRoundTrip, unit) < distance;
}

function triggerPulse() {
    // Reset trigger pin
    pins.setPull(ultrasonicState.trig, PinPullMode.PullNone);
    pins.digitalWritePin(ultrasonicState.trig, 0);
    control.waitMicros(2);

    // Trigger pulse
    pins.digitalWritePin(ultrasonicState.trig, 1);
    control.waitMicros(10);
    pins.digitalWritePin(ultrasonicState.trig, 0);
}

function getMedianRRT(roundTrips: UltrasonicRoundTrip[]) {
    const roundTripTimes = roundTrips.map((urt) => urt.rtt);
    return median(roundTripTimes);
}

// Returns median value of non-empty input
function median(values: number[]) {
    values.sort((a, b) => {
        return a - b;
    });
    return values[(values.length - 1) >> 1];
}

function measureInBackground() {
    const trips = ultrasonicState.roundTrips;
    const TIME_BETWEEN_PULSE_MS = 145;

    while (true) {
        const now = input.runningTime();

        if (trips[trips.length - 1].ts < now - TIME_BETWEEN_PULSE_MS - 10) {
            ultrasonicState.roundTrips.push({
                ts: now,
                rtt: MAX_ULTRASONIC_TRAVEL_TIME,
            });
        }

        while (trips.length > ULTRASONIC_MEASUREMENTS) {
            trips.shift();
        }

        ultrasonicState.medianRoundTrip = getMedianRRT(
            ultrasonicState.roundTrips
        );

        for (let i = 0; i < ultrasonicState.travelTimeObservers.length; i++) {
            const threshold = ultrasonicState.travelTimeObservers[i];
            if (threshold > 0 && ultrasonicState.medianRoundTrip <= threshold) {
                control.raiseEvent(
                    MICROBIT_MAKERBIT_ULTRASONIC_OBJECT_DETECTED_ID,
                    threshold
                );
                // use negative sign to indicate that we notified the event
                ultrasonicState.travelTimeObservers[i] = -threshold;
            } else if (
                threshold < 0 &&
                ultrasonicState.medianRoundTrip > -threshold
            ) {
                // object is outside the detection threshold -> re-activate observer
                ultrasonicState.travelTimeObservers[i] = -threshold;
            }
        }

        triggerPulse();
        basic.pause(TIME_BETWEEN_PULSE_MS);
    }


}
