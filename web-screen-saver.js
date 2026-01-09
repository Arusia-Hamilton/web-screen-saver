(function() {
    let idleTimer;
    const IDLE_TIME_LIMIT = 5 * 60 * 1000; 
    let canvas, ctx;
    let isScreensaverActive = false;
    let animationId;
    let styleElement;

    const groupCount = 3;
    const numPoints = 4;
    const ribbonWidth = 30; 
    let lineGroups = [];

    // --- 動きのパラメータ ---
    const MIN_SPEED = 2.0;    // 最低速度
    const MAX_SPEED = 5.0;    // 最高速度
    const NOISE_SCALE = 0.15; // 曲がる強さ

    function init() {
        resetTimer();
        ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
            window.addEventListener(event, resetTimer, true);
        });
        window.addEventListener('resize', handleResize);
    }

    function handleResize() {
        if (isScreensaverActive && canvas) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
    }

    function resetTimer() {
        if (isScreensaverActive) stopScreensaver();
        clearTimeout(idleTimer);
        idleTimer = setTimeout(startScreensaver, IDLE_TIME_LIMIT);
    }

function startScreensaver() {
        isScreensaverActive = true;

        // 強制的にカーソルを消すためのCSSを注入
        styleElement = document.createElement('style');
        styleElement.innerHTML = `
            * { cursor: none !important; }
        `;
        document.head.appendChild(styleElement);

        // キャンバスの作成
        canvas = document.createElement('canvas');
        Object.assign(canvas.style, {
            position: 'fixed', 
            top: '0', 
            left: '0', 
            zIndex: '9999',
            pointerEvents: 'none', 
            backgroundColor: 'transparent'
        });
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        document.body.appendChild(canvas);
        ctx = canvas.getContext('2d');
        initLineGroups();
        animate();
    }

    function stopScreensaver() {
        isScreensaverActive = false;
        cancelAnimationFrame(animationId);

        // 注入したスタイルを削除
        if (styleElement && styleElement.parentNode) {
            styleElement.parentNode.removeChild(styleElement);
        }

        // キャンバスを削除
        if (canvas && canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
        }
    }

    function initLineGroups() {
        lineGroups = [];
        // 360度をグループ数で割った間隔を計算
        const hueStep = 360 / groupCount;
        // 毎回同じ色から始まらないよう、全体の開始地点だけランダムにする
        const startOffset = Math.random() * 360;

        for (let g = 0; g < groupCount; g++) {
            let points = [];
            for (let i = 0; i < numPoints; i++) {
                const angle = Math.random() * Math.PI * 2;
                points.push({
                    x: Math.random() * window.innerWidth,
                    y: Math.random() * window.innerHeight,
                    vx: Math.cos(angle) * MIN_SPEED,
                    vy: Math.sin(angle) * MIN_SPEED,
                    noiseAngle: Math.random() * Math.PI * 2,
                    history: []
                });
            }
            // 各グループの色を等間隔（hueStepずつ）にずらして設定
            lineGroups.push({ 
                points: points, 
                baseHue: (startOffset + g * hueStep) % 360 
            });
        }
    }

    function animate() {
        if (!isScreensaverActive) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        lineGroups.forEach((group) => {
            group.points.forEach(p => {
                // 滑らかに方向を変える（旋回させる）
                p.noiseAngle += (Math.random() - 0.5) * NOISE_SCALE;
                p.vx += Math.cos(p.noiseAngle) * 0.2;
                p.vy += Math.sin(p.noiseAngle) * 0.2;

                // 速度制限（遅すぎず、速すぎず）
                const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                if (speed < MIN_SPEED) {
                    p.vx = (p.vx / speed) * MIN_SPEED;
                    p.vy = (p.vy / speed) * MIN_SPEED;
                } else if (speed > MAX_SPEED) {
                    p.vx = (p.vx / speed) * MAX_SPEED;
                    p.vy = (p.vy / speed) * MAX_SPEED;
                }

                p.x += p.vx;
                p.y += p.vy;

                // 壁での跳ね返り（端に張り付かないように補正）
                if (p.x < 0) { p.x = 0; p.vx *= -1; p.noiseAngle = Math.PI - p.noiseAngle; }
                if (p.x > canvas.width) { p.x = canvas.width; p.vx *= -1; p.noiseAngle = Math.PI - p.noiseAngle; }
                if (p.y < 0) { p.y = 0; p.vy *= -1; p.noiseAngle = -p.noiseAngle; }
                if (p.y > canvas.height) { p.y = canvas.height; p.vy *= -1; p.noiseAngle = -p.noiseAngle; }

                p.history.unshift({x: p.x, y: p.y});
                if (p.history.length > ribbonWidth) p.history.pop();
            });

            // 描画（ベジェ曲線）
            for (let i = ribbonWidth - 1; i >= 0; i--) {
                if (group.points[0].history[i]) {
                    ctx.beginPath();
                    const opacity = (1 - (i / ribbonWidth)) * 0.5;
                    const hue = (group.baseHue + Date.now() / 60 - i * 2) % 360;
                    ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${opacity})`;
                    ctx.lineWidth = 2;

                    let p0 = group.points[0].history[i];
                    ctx.moveTo(p0.x, p0.y);
                    for (let j = 1; j < numPoints; j++) {
                        let p1 = group.points[j].history[i];
                        let p2 = group.points[(j + 1) % numPoints].history[i];
                        let xc = (p1.x + p2.x) / 2;
                        let yc = (p1.y + p2.y) / 2;
                        ctx.quadraticCurveTo(p1.x, p1.y, xc, yc);
                    }
                    ctx.closePath();
                    ctx.stroke();
                }
            }
        });

        animationId = requestAnimationFrame(animate);
    }

    window.onload = init;
})();

