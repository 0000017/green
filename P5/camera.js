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
		capture = p.createCapture(p.VIDEO, { flipped: true })
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
		const remaining = p.max(0, startTime + 20*1000 - p.millis())
		if (startTime === -1 || (startTime > 0 && remaining === 0)) {
			film.draw(() => p.background(0))
			startTime = p.millis()
		}
	}

	p.keyPressed = function() {
		if (startTime > 0) {
			const remaining = p.max(0, startTime + 20*1000 - p.millis())
			if (remaining === 0) {
				p.clear()
				p.imageMode(p.CENTER)
				p.image(film, 0, 0)
				p.saveCanvas('daguerreotype.png')
			}
		}
	}

	function downloadURI(uri, name) {
		var link = document.createElement("a");
		link.download = name;
		link.href = uri;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		delete link;
	}

	p.draw = function() {
		p.background(0)
		p.noStroke()
		p.textFont(font)
		p.imageMode(p.CENTER)
		p.textAlign(p.CENTER, p.CENTER)
		p.push()
		p.tint(255 * (startTime < 0 ? 0.5 : 0.2))
		p.image(capture, 0, 0, p.width, p.height, 0, 0, capture.width, capture.height, p.COVER)
		p.pop()
		if (startTime < 0) {
			p.push()
			p.fill(255)
			p.textSize(40)
			p.text('A photo takes 20s. Click to start exposure', 0, 0)
			p.pop()
		}	else {
			const remaining = p.max(0, startTime + 20*1000 - p.millis())
			
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
					filmShader.setUniform('t', p.millis())
					p.scale(p.max(p.width/capture.width, p.height/capture.height))
					p.plane(capture.width, capture.height)
				})
			}
			
			p.push()
			p.scale(0.7)
			p.image(film, 0, 0)
			p.pop()
			
			if (remaining === 0) {
				p.push()
				p.scale(0.7)
				p.fill(255, 255 * p.map(p.millis(), startTime + 20*1000, startTime + 21*1000, 1, 0, true))
				p.plane(p.width, p.height)
				p.pop()
			}
			
			if (remaining > 0) {
				p.push()
				const remSecs = p.ceil(remaining / 1000)
				p.textSize(40)
				p.translate(0, p.height/2 - 50)
				p.text(`Hold still! ${remSecs}s to go!`, 0, 0)
				p.pop()
			} else {
				p.push()
				p.textSize(40)
				p.translate(0, p.height/2 - 50)
				p.text(`Press any key to save your daguerreotype. Click to take another.`, 0, 0)
				p.pop()
			}
		}
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