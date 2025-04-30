function cameraSketch(p) {
	let film
	let filmShader
	let startTime = -1
	let capture
	let font

	p.preload = function() {
		// EB Garamond Italic
		font = p.loadFont('https://fonts.gstatic.com/s/ebgaramond/v27/SlGFmQSNjdsmc35JDF1K5GRwUjcdlttVFm-rI7e8QI96WamXgXFI.ttf')
	}

	p.setup = function() {
		p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL);
		film = p.createFramebuffer({ format: p.FLOAT })
		
		// 保持一致性：都不翻转或都翻转
		// 此处选择不翻转，因为在WEBGL模式下需要特殊处理
		capture = p.createCapture(p.VIDEO, { flipped: false })
		capture.hide()
		filmShader = p.createFilterShader(`precision highp float;
	
		float random(vec2 p) {
			vec3 p3  = fract(vec3(p.xyx) * .1031);
			p3 += dot(p3, p3.yzx + 33.33);
			return fract((p3.x + p3.y) * p3.z);
		}

		// x,y coordinates, given from the vertex shader
		varying vec2 vTexCoord;

		uniform sampler2D tex0;
		uniform float brightness;
		uniform float t;

		void main() {
			vec2 coord = vTexCoord;
			float fromCenter = max(0., dot(normalize(vec3(coord-0.5, 0.15)), vec3(0., 0., 1.)));
			coord += vec2(
				random(coord*123.456 + t) - 0.5,
				random(coord*123.456 + t + 789.012) - 0.5
			) * 0.035 * pow(1. - fromCenter, 3.);
			
			vec4 color = texture2D(tex0, coord);
			color.rgb = vec3(smoothstep(0., 1., color.b + (random(coord*12.34 + t)-0.5)) > 0.5 ? 1. : 0.);
			color.rgb += (random(vTexCoord*127.341)-0.5) * 0.1;
			gl_FragColor = color * brightness * pow(fromCenter, 0.8);
		}`)
	}

	p.mousePressed = function() {
		const remaining = p.max(0, startTime + 20*1000 - performance.now())
		if (startTime === -1 || (startTime > 0 && remaining === 0)) {
			film.draw(() => p.background(0))
			// 使用performance.now()而不是p.millis()，与sketch.js保持一致
			startTime = performance.now();
			
			// 将startTime暴露给外部控制倒计时
			p.startTime = startTime;
			
			console.log("开始拍照，startTime:", startTime);
		}
	}

	p.draw = function() {
		p.background(0)
		p.noStroke()
		p.textFont(font)
		p.imageMode(p.CENTER)
		p.textAlign(p.CENTER, p.CENTER)
		p.push()
		p.tint(255 * (startTime < 0 ? 0.5 : 0.2))
		
		// WEBGL模式下需要进行特殊处理以保持正确方向
		// 注意：在WEBGL模式下，坐标系是不同的
		if (capture.width > 0 && capture.height > 0) {
			// 应用变换以保持一致方向
			p.scale(1, 1); // 不翻转
		p.image(capture, 0, 0, p.width, p.height, 0, 0, capture.width, capture.height, p.COVER)
		}
		
		p.pop()
		if (startTime < 0) {
			p.push()
			p.fill(255)
			p.textSize(40)
			p.text('点击开始拍照，曝光需要20秒', 0, 0)
			p.pop()
		}	else {
			// 使用performance.now()计算剩余时间，与sketch.js保持一致
			const now = performance.now();
			const remaining = p.max(0, startTime + 20*1000 - now);
			
			if (remaining > 0) {
				film.draw(() => {
					p.blendMode(p.ADD)
					p.shader(filmShader)
					// Initially I tried using tint() to slowly accumulate exposure, but
					// tint(255, 1) exposed too fast, and smaller values like tint(255, 0.2)
					// never accumulated. Not sure why yet. I was going to use a shader
					// anyway to do the vignette and edge blur so I ended up applying the
					// same alpha tint in the shader instead.
					filmShader.setUniform('brightness', 1 / (p.frameRate() * 20))
					filmShader.setUniform('tex0', capture)
					filmShader.setUniform('t', now)
					p.scale(p.max(p.width/capture.width, p.height/capture.height))
					p.plane(capture.width, capture.height)
				})
			}
			
			p.push()
			// 确保渲染的方向与摄像头一致
			p.scale(0.7)
			p.image(film, 0, 0)
			p.pop()
			
			if (remaining === 0) {
				p.push()
				p.scale(0.7)
				p.fill(255, 255 * p.map(now, startTime + 20*1000, startTime + 21*1000, 1, 0, true))
				p.plane(p.width, p.height)
				p.pop()
			}
		}
		
		// 确保startTime变量持续更新以便外部访问
		p.startTime = startTime;
	}

	// 当P5实例被移除时的清理函数
	p.remove = function() {
		if (capture) {
			capture.stop()
		}
		// 调用P5的原生remove方法
		p._remove()
	}
}

// 将cameraSketch导出为全局函数
window.cameraSketch = cameraSketch;