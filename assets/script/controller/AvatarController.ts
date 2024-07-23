const { ccclass, property } = _decorator;
import { _decorator, animation, Camera, Canvas, Collider, Component, EventMouse, EventTouch, ICollisionEvent, ITriggerEvent, math, Node, NodeSpace, Quat, toDegree, toRadian, v2, v3, Vec2, Vec3 } from 'cc';
import { Joystick, JoystickEventType } from '../../package/joystick/script/Joystick';
import { CharacterStatus } from './CharacterStatus';
import { getForward, signedAngleVec3 } from '../util/Math';

@ccclass('AvatarController')
export class AvatarController extends Component {
    // @injectComponent(animation.AnimationController)
    private _animationController: animation.AnimationController;

    @_decorator.property
    public baseSpeed = 2.0;

    @_decorator.property
    public mouseTurnSpeed = 1.0;

    @_decorator.property({ unit: '°/s' })
    public moveTurnSpeed = 270;

    @_decorator.property(Node)
    public input: Node | null = null;

    @property(Joystick)
    public joyStick!: Joystick;

    @property(Camera)
    public camera:Camera = null;

    private _charStatus: CharacterStatus;

    private _turnEnabled:boolean = false;
    private _cameraOffset:Vec3 = null;
    private _cameraForward:Vec3 = Vec3.ZERO.clone();
    private _cameraRight:Vec3 = Vec3.ZERO.clone();

    start() {
        this._charStatus = this.node.addComponent(CharacterStatus);
        this._animationController = this.node.getComponent(animation.AnimationController);
        if (this._animationController == null)
            this._animationController = this.node.getComponentInChildren(animation.AnimationController);

        if (this.input) {
            const { input } = this;
            if (Joystick.isTouchDevice()) {
                input.on(Node.EventType.TOUCH_START, this._onTouchBegin, this);
                input.on(Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
            } else {
                input.on(Node.EventType.MOUSE_DOWN, this._onMouseDown, this);
                input.on(Node.EventType.MOUSE_MOVE, this._onMouseMove, this);
                input.on(Node.EventType.MOUSE_UP, this._onMouseUp, this);
            }
        }

        if (this.joyStick) {
            // this.joyStick.on(JoystickEventType.MOVE, (_joystickDirection: Readonly<math.Vec2>) => {
            // });
    
            this.joyStick.on(JoystickEventType.RELEASE, () => {
                this.stopAvatar();
            });
        }

        if (this.camera) {
            this._cameraOffset = this.camera.node.getWorldPosition().subtract(this.node.getWorldPosition());
        }
        
        const collider = this.getComponent(Collider);
        if (collider) {
            collider.on('onCollisionEnter', this.onCollisionEnter, this);
            collider.on('onTriggerEnter', this.onTriggerEnter, this);
        }
    }

    onDestroy() {
        const collider = this.getComponent(Collider);
        if (collider) {
            collider.off('onCollisionEnter', this.onCollisionEnter, this);
            collider.off('onTriggerEnter', this.onTriggerEnter, this);
        }
    }

    onCollisionEnter(event: ICollisionEvent) {
        this.doCollisionEnter(event);
    }

    onTriggerEnter (event: ITriggerEvent) {
        this.doTriggerEnter(event);
    }

    protected doCollisionEnter(event: ICollisionEvent){

    }

    protected doTriggerEnter(event: ITriggerEvent){

    }

    protected canMove() {
        return true;
    }

    protected sholdStopImmediate() {
        return this.moveTurnSpeed == 0;
    }

    protected getMaxSpeed(){
        return this.baseSpeed;
    }

    protected setAnimationSpeed(speed:number){
        this.setAnimationValue('Speed', speed);
    }

    protected setAnimationValue(tag:string, value:any){
        if (this._animationController)
            this._animationController.setValue(tag, value);
    }

    private _onMouseDown (event: EventMouse) {
        switch (event.getButton()) {
            default:
                break;
            case EventMouse.BUTTON_RIGHT:
                this._turnEnabled = true;
                break;
        }
    }

    private _onMouseMove (event: EventMouse) {
        if (this._turnEnabled) {
            const dx = event.getDeltaX();
            if (dx) {
                const angle = -dx * this.mouseTurnSpeed;
                this.node.rotate(
                    math.Quat.rotateY(new math.Quat(), math.Quat.IDENTITY, math.toRadian(angle)),
                    Node.NodeSpace.WORLD,
                );
            }
        }
    }

    private _onMouseUp (event: EventMouse) {
        switch (event.getButton()) {
            default:
                break;
            case EventMouse.BUTTON_RIGHT:
                this._turnEnabled = false;
                break;
        }
    }

    private _onTouchBegin (eventTouch: EventTouch) {
        
    }

    private _onTouchMove (eventTouch: EventTouch) {
        if (eventTouch.getTouches().length === 1) {
            const dx = eventTouch.getUIDelta().x;
            if (dx) {
                const angle = -dx * this.mouseTurnSpeed;
                this.node.rotate(
                    math.Quat.rotateY(new math.Quat(), math.Quat.IDENTITY, math.toRadian(angle)),
                    Node.NodeSpace.WORLD,
                );
            }
        }
    }

    convertScreenDirectionToWorldDirection(screenDirection: Vec2): Vec3 {
        // Get the forward and right vectors of the camera
        this._cameraForward.set(this.camera.node.forward).normalize();
        this._cameraRight.set(this.camera.node.right).normalize();

        // Combine the forward and right vectors with the screen direction
        const worldDirection = this._cameraRight.multiplyScalar(screenDirection.x).add(this._cameraForward.multiplyScalar(screenDirection.y));
        
        // Make sure the direction is only on the XZ plane
        worldDirection.y = 0;
        worldDirection.normalize();

        worldDirection.multiplyScalar(screenDirection.length());

        return worldDirection;
    }

    protected fetchMovementInput() : Vec3 {
        if (this.joyStick){
            const joystickDirection = this.joyStick.direction;

            if (!Vec2.equals(joystickDirection, Vec2.ZERO)){
                if (this.camera) {
                    return this.convertScreenDirectionToWorldDirection(joystickDirection);
                } else {
                    return v3(
                        -(joystickDirection.x),
                        0.0,
                        joystickDirection.y,
                    );
                    // Vec3.normalize(input, input);
                }
            }
        }

        return null;
    }

    protected faceView(movementInput: math.Vec3, deltaTime: number, moveNode:Node=null, moveTurnSpeed:number=-1) {
        if (!moveNode)
            moveNode = this.node;
        
        const viewDir = v3(movementInput);
        viewDir.y = 0.0;
        viewDir.normalize();

        const characterDir = getForward(moveNode);
        characterDir.y = 0.0;
        characterDir.normalize();

        const currentAimAngle = signedAngleVec3(characterDir, viewDir, Vec3.UNIT_Y);
        const currentAimAngleDegMag = toDegree(Math.abs(currentAimAngle));

        if (moveTurnSpeed < 0)
            moveTurnSpeed = this.moveTurnSpeed;

        const maxRotDegMag = moveTurnSpeed > 0 ? this.moveTurnSpeed * deltaTime : currentAimAngleDegMag;
        const rotDegMag = Math.min(maxRotDegMag, currentAimAngleDegMag);
        const q = Quat.fromAxisAngle(new Quat(), Vec3.UNIT_Y, Math.sign(currentAimAngle) * toRadian(rotDegMag));
        moveNode.rotate(q, NodeSpace.WORLD);

        return currentAimAngleDegMag;
    }

    private _getViewDirection(out: Vec3) {
        if (!this.camera) {
            return Vec3.set(out, 0, 0, -1);
        } else {
            return Vec3.negate(out, getForward(this.camera.node));
        }
    }

    private _applyInput(movementInput: Readonly<Vec3>) {
        const inputVector = new Vec3(movementInput);

        // math.Vec3.normalize(inputVector, inputVector);
        math.Vec3.multiplyScalar(inputVector, inputVector, this.getMaxSpeed());

        // const viewDir = this._getViewDirection(new Vec3());
        // viewDir.y = 0.0;
        // Vec3.normalize(viewDir, viewDir);

        // const q = Quat.rotationTo(new Quat(), Vec3.UNIT_Z, viewDir);
        // Vec3.transformQuat(inputVector, inputVector, q);

        this._charStatus.velocity = inputVector;
    }

    public stopAvatar(immediate:boolean = false) {
        if (immediate)
            this._charStatus.setVelocityImmediate(math.Vec3.ZERO);
        else
            this._charStatus.velocity = math.Vec3.ZERO;

        this.setAnimationSpeed(0);
    }

    update(deltaTime: number) {
        if (this.canMove()) {
            const movementInput = this.fetchMovementInput();
            if (movementInput){
                const { _charStatus: characterStatus } = this;
                const { localVelocity } = characterStatus;
        
                const shouldMove = !Vec3.equals(movementInput, Vec3.ZERO, 1e-2);
                // if (this._animationController)
                //     this._animationController.setValue('ShouldMove', shouldMove);
                if (shouldMove) {
                    if (!Vec3.equals(movementInput, Vec3.ZERO)) {
                        this.faceView(movementInput, deltaTime);
                    }
        
                    this._applyInput(movementInput);
                    const velocity2D = new math.Vec2(localVelocity.x, localVelocity.z);
                    this.setAnimationSpeed(velocity2D.length());
            
                    if (this.camera) {
                        // Lerp the camera's position towards the target position
                        let targetPosition = this.node.getWorldPosition().add(this._cameraOffset);
                        this.camera.node.setWorldPosition(this.camera.node.getWorldPosition().lerp(targetPosition, 0.1));
                    }
                    return;
                }
            }
        }

        this.stopAvatar();        
    }

    // public lateUpdate() {
        // this._animationController.setValue('Jump', false);
        // this._animationController.setValue('Kick', false);
    // }
}


