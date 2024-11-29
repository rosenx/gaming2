/**
 *
 * by littlefean
 */
class World {

    /**
     *
     * @param width {Number}
     * @param height {Number}
     */
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.batterys = [];
        this.buildings = [];
        this.monsters = new Set();
        this.effects = new Set();  // 特效层
        this.othersBullys = [];  // 多余的子弹，比如子弹分裂后的子弹
        this.time = 0;
        this.mode = "normal";
        // 安置大本
        let RootBuilding = BuildingFinally.Root(this);
        RootBuilding.pos = new Vector(this.width / 2, this.height / 2);
        this.rootBuilding = RootBuilding; // 大本建筑 （特殊）
        this.addBuilding(this.rootBuilding);

        this.user = {
            money: 600,
            putLoc: {x: 0, y: 0, able: false, building: null}
        };

        // 当前怪物流信息
        this.monsterFlow = MonsterGroup.getMonsterFlow(this, 1, this.mode);
        this.monsterFlowNext = MonsterGroup.getMonsterFlow(this, 2, this.mode);
        // 非怪物流模式信息
        this.haveFlow = true;  // 一般是有怪物流的，若想取消怪物流，这个需要改成没有
        this.monsterAddFreezeTick = 200;
        this.monsterPreAdd = 3;  // 每次增加多少个怪物
        this.maxMonsterNum = 250;  // 最多怪物数量

    }

    resizeCanvas(canvasElement) {
        canvasElement.width = this.width * PR;
        canvasElement.height = this.height * PR;
        canvasElement.style.width = this.width + "px";
        canvasElement.style.height = this.height + "px";
        // this.ctx.translate(0.5 * PR, 0.5 * PR);
    }

    /**
     * 获取我方所有实体
     */
    getAllBuildingArr() {
        let res = [];
        for (let item of this.buildings) {
            res.push(item);
        }
        for (let item of this.batterys) {
            res.push(item);
        }
        return res;
    }

    /**
     * 获取我方所有子弹，返回一个数组
     */
    getAllBullyToArr() {
        let res = [];
        for (let tower of this.batterys) {
            for (let b of tower.bullys) {
                res.push(b);
            }
        }
        for (let b of this.othersBullys) {
            res.push(b);
        }
        return res;
    }

    addTower(battery) {
        this.batterys.push(battery);
    }

    /**
     * 往世界中添加一个怪物
     * @param monster {Monster}
     */
    addMonster(monster) {
        this.monsters.add(monster);
    }

    addEffect(effect) {
        this.effects.add(effect);
    }

    /**
     *
     * @param building {Building}
     */
    addBuilding(building) {
        this.buildings.push(building);
    }

    goTick() {
        // 清除独立子弹
        let pArr = [];
        for (let p of this.othersBullys) {
            if (!p.isOutScreen()) {
                pArr.push(p);
            }
        }
        this.othersBullys = pArr;
        // 清除炮塔
        let tArr = [];
        for (let t of this.batterys) {
            if (!t.isDead()) {
                tArr.push(t);
            } else {
                let e = new EffectCircle(t.pos);
                e.animationFunc = e.destroyAnimation;
                this.addEffect(e);
            }
        }
        this.batterys = tArr;
        // 清除建筑
        let bArr = [];
        for (let b of this.buildings) {
            if (!b.isDead()) {
                bArr.push(b);
            }
        }
        this.buildings = bArr;
        // 清除特效
        for (let e of this.effects) {
            if (!e.isPlay) {
                this.effects.delete(e);
            }
        }
        // 添加怪物流
        this.worldAddMonster();
        // 炮塔行动
        for (let b of this.batterys) {
            b.goStep();
        }
        // 独立子弹行动
        for (let p of this.othersBullys) {
            p.goStep();
        }
        // 建筑行动
        for (let b of this.buildings) {
            b.goStep();
        }
        // 怪物行动
        for (let m of this.monsters) {
            m.goStep();
        }
        // 特效步进
        for (let e of this.effects) {
            e.goStep();
        }
        this.time++;
    }

    /**
     * 以这个世界自己的情况来添加怪物
     */
    worldAddMonster() {
        if (this.haveFlow) {
            // 以怪物流的方式添加怪物
            if (this.monsterFlow.couldBegin()) {
                this.monsterFlow.addToWorld(this.mode);

                this.monsterFlow = this.monsterFlowNext.copySelf();
                this.monsterFlowNext = MonsterGroup.getMonsterFlow(this,
                    this.monsterFlowNext.level + 1, this.mode);
            }
            if (this.monsterFlow.delayTick === 200 - 1) {
                // 添加文字提醒
                let et = new EffectText(`Wave ${this.monsterFlow.level} is coming!`);
                et.textSize = 40;
                et.duration = 100;
                et.pos = new Vector(this.width / 2, this.height / 2);
                this.addEffect(et);
                // 添加声音提醒
                Sounds.playNewMonsterFlow();
            }
        } else {
            // 随机添加怪物
            if (this.time % this.monsterAddFreezeTick !== 0) {
                return;
            }

            let monsterPreAddAdd;
            if (this.mode === "easy") {
                monsterPreAddAdd = Functions.tickAddMonsterNumEasy(this.time);
            } else {
                monsterPreAddAdd = Functions.tickAddMonsterNumHard(this.time);
            }
            if (this.time % 5000 === 0 && this.time !== 0) {
                let m = MonsterFinally.T800(this);
                for (let i = 0; i < Functions.levelT800Count(this.time / 500); i++) {
                    this.monsters.add(m);
                }
                return;
            }
            for (let i = 0; i < this.monsterPreAdd + monsterPreAddAdd; i++) {
                let choice = (arr) => {
                    return arr[Math.floor(Math.random() * arr.length)];
                };
                let m = choice(MonsterAllArr)(this);
                if (this.mode === "easy") {
                    m = choice(MonsterEasyArr)(this);
                    m.hpInit(m.maxHp + Functions.tickMonsterHpAddedEasy(this.time));
                    m.addPrice += Functions.levelAddPrice(1 + this.time / 500);
                } else if (this.mode === "normal") {
                    m.hpInit(m.maxHp + Functions.levelMonsterHpAddedNormal(this.time / 500));
                    m.colishDamage += Functions.levelCollideAdded(this.time / 500);
                    m.addPrice += Functions.levelAddPriceNormal(this.time / 500);
                } else if (this.mode === "hard") {
                    if (this.time < 5000) {
                        m = choice(Monster10BeforeArr)(this);
                    }

                    m.hpInit(m.maxHp + Functions.tickMonsterHpAddedHard(this.time));
                    m.colishDamage += Functions.levelCollideAddedHard(this.time / 500);
                    m.addPrice += Functions.levelAddPriceHard(1 + this.time / 500);
                }
                this.monsters.add(m);
            }
        }

    }

    /**
     *
     * @param canvasEle {Element}
     */
    render(canvasEle) {
        let canvasElement = document.querySelector("canvas");
        let ctx = canvasElement.getContext("2d");
        ctx.clearRect(0, 0, standardize(this.width), standardize(this.height));

        for (let b of this.batterys) {
            b.render(ctx);
        }
        for (let b of this.othersBullys) {
            b.render(ctx);
        }
        for (let b of this.buildings) {
            b.render(ctx);
        }
        for (let m of this.monsters) {
            m.render(ctx);
        }
        for (let e of this.effects) {
            e.render(ctx);
        }
        // 渲染即将放置的位置
        if (this.user.putLoc.building !== null && this.user.putLoc.building !== undefined) {
            let x = this.user.putLoc.x;
            let y = this.user.putLoc.y;
            let body = new Circle(x, y, this.user.putLoc.building.r);
            body.renderView(ctx);

            new Circle(x, y, this.user.putLoc.building.rangeR).renderView(ctx);
        }

        // 写一些基本信息
        ctx.font = "16px Microsoft YaHei";
        ctx.fillStyle = "black";
        ctx.textAlign = "left";
        ctx.fillText("money：" + this.user.money.toString(), 20, 20);
        ctx.fillText("Number of Monsters：" + this.monsters.size, 20, 40);
        ctx.fillText("Number of turrets：" + this.batterys.length, 20, 60);
        ctx.fillText("Number of turrets：" + this.batterys.length, 20, 60);
        ctx.fillText("The next wave：" + this.monsterFlow.toString(), 20, 80);
        ctx.fillText("Current wave number：" + (this.monsterFlow.level - 1), 20, 100);
        ctx.fillText("Countdown：" + (this.monsterFlow.delayTick), 20, 120);
    }
}
