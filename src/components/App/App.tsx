import { useCallback, useEffect, useRef, useState } from "react"
import * as Tone from "tone"
import "./App.styles.scss"

const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
const flats = ["C", "D", "E", "F", "G", "A", "B"]
const sharps = [
  null,
  "C#",
  null,
  "D#",
  null,
  null,
  "F#",
  null,
  "G#",
  null,
  "A#",
  null,
]

const keyboard: { [keycode: string]: number } = {
  q: 0,
  2: 1,
  w: 2,
  3: 3,
  e: 4,
  r: 5,
  5: 6,
  t: 7,
  6: 8,
  y: 9,
  7: 10,
  u: 11,
  v: 12,
  g: 13,
  b: 14,
  h: 15,
  n: 16,
  m: 17,
  k: 18,
  ",": 19,
  l: 20,
  ".": 21,
  ":": 22,
  "/": 23,
  shift: 24,
}

const midi: { [keycode: number]: number } = {
  48: 0,
  49: 1,
  50: 2,
  51: 3,
  52: 4,
  53: 5,
  54: 6,
  55: 7,
  56: 8,
  57: 9,
  58: 10,
  59: 11,
  60: 12,
  61: 13,
  62: 14,
  63: 15,
  64: 16,
  65: 17,
  66: 18,
  67: 19,
  68: 20,
  69: 21,
  70: 22,
  71: 23,
  72: 24,
}

const octaves = [3, 4]

export function App() {
  const synth = useRef(
    new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: "sine",
      },
    }),
  )
  const reverbEffect = useRef(new Tone.Reverb())
  const distortionEffect = useRef(new Tone.Distortion(0.2))
  const chorusEffect = useRef(new Tone.Chorus(4, 2.5, 0.5))
  const [volume, setVolume] = useState(0)
  const activeKeysRef = useRef<{ [note: string]: boolean }>({})
  const keysRef = useRef(
    octaves
      .flatMap((octave) => notes.map((note) => `${note}${octave}`))
      .concat([`C${octaves[octaves.length - 1] + 1}`]),
  )
  const [type, setType] = useState<"sine" | "sawtooth" | "triangle">("sine")
  const [reverb, setReverb] = useState(false)
  const [distortion, setDistortion] = useState(false)
  const [chorus, setChorus] = useState(false)

  useEffect(() => {
    ;(navigator as any).requestMIDIAccess().then((access: any) => {
      access.inputs.forEach((input: any) => {
        input.onmidimessage = (event: any) => {
          if (typeof midi[event?.data?.[1]] === "number") {
            if (event?.data?.[0] === 145) {
              onKeyDown(keysRef.current?.[midi[event.data[1]]])
            } else {
              onKeyUp(keysRef.current?.[midi[event.data[1]]])
            }
          }
        }
      })
    })
  }, [])

  useEffect(() => {
    synth.current.set({ oscillator: { type } })
  }, [type])

  useEffect(() => {
    synth.current.disconnect()
    if (reverb && distortion && chorus) {
      synth.current.chain(
        chorusEffect.current,
        distortionEffect.current,
        reverbEffect.current,
        Tone.Destination,
      )
    } else if (reverb && distortion) {
      synth.current.chain(
        distortionEffect.current,
        reverbEffect.current,
        Tone.Destination,
      )
    } else if (reverb && chorus) {
      synth.current.chain(
        chorusEffect.current,
        reverbEffect.current,
        Tone.Destination,
      )
    } else if (distortion && chorus) {
      synth.current.chain(
        chorusEffect.current,
        distortionEffect.current,
        Tone.Destination,
      )
    } else if (reverb) {
      synth.current.chain(reverbEffect.current, Tone.Destination)
    } else if (distortion) {
      synth.current.chain(distortionEffect.current, Tone.Destination)
    } else if (chorus) {
      synth.current.chain(chorusEffect.current, Tone.Destination)
    } else {
      synth.current.chain(Tone.Destination)
    }
  }, [distortion, reverb, chorus])

  useEffect(() => {
    if (volume > -10) {
      synth.current.volume.value = volume
    } else {
      synth.current.volume.value = synth.current.volume.minValue
    }
  }, [volume])

  useEffect(() => {
    if (reverb) {
      reverbEffect.current.set({ wet: 0.7 })
    } else {
      reverbEffect.current.set({ wet: 1 })
    }
  }, [reverb])

  useEffect(() => {
    if (distortion) {
      distortionEffect.current.set({ wet: 0.7 })
    } else {
      distortionEffect.current.set({ wet: 1 })
    }
  }, [distortion])

  useEffect(() => {
    if (chorus) {
      chorusEffect.current.set({ wet: 0.7 })
    } else {
      chorusEffect.current.set({ wet: 1 })
    }
  }, [chorus])

  const onKeyUp = useCallback((key: string | undefined) => {
    if (key) {
      const now = Tone.now()
      synth.current.triggerRelease(key, now)

      activeKeysRef.current[key] = false

      document
        .querySelector(`.key.${key.replace("#", "sharp")}`)
        ?.classList.remove("pressed")
    }
  }, [])

  const onKeyDown = useCallback((key: string | undefined) => {
    if (key && !activeKeysRef.current[key]) {
      const now = Tone.now()
      synth.current.triggerAttack(key, now)

      activeKeysRef.current[key] = true

      document
        .querySelector(`.key.${key.replace("#", "sharp")}`)
        ?.classList.add("pressed")
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (keysRef.current?.[keyboard?.[e.key]]) {
        onKeyDown(keysRef.current[keyboard[e.key]])
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (keysRef.current?.[keyboard?.[e.key]] !== undefined) {
        onKeyUp(keysRef.current[keyboard[e.key]])
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    document.addEventListener("keyup", handleKeyUp)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("keyup", handleKeyUp)
    }
  }, [onKeyDown, onKeyUp])

  return (
    <div className="App">
      <div className="keyboard">
        <div className="top">
          <div className="types">
            <div
              className={`type ${type === "sine" ? "pressed" : ""}`}
              onClick={() => setType("sine")}
            >
              Sine
            </div>
            <div
              className={`type ${type === "sawtooth" ? "pressed" : ""}`}
              onClick={() => setType("sawtooth")}
            >
              Saw
            </div>
            <div
              className={`type ${type === "triangle" ? "pressed" : ""}`}
              onClick={() => setType("triangle")}
            >
              Triangle
            </div>
          </div>
          <div className="effects">
            <div
              className={`effect ${reverb ? "pressed" : ""}`}
              onClick={() => setReverb(!reverb)}
            >
              Reverb
            </div>
            <div
              className={`effect ${distortion ? "pressed" : ""}`}
              onClick={() => setDistortion(!distortion)}
            >
              Distortion
            </div>
            <div
              className={`effect ${chorus ? "pressed" : ""}`}
              onClick={() => setChorus(!chorus)}
            >
              Chorus
            </div>
          </div>
          <div className="name">Wavescript 9001</div>
          <label className="label">Volume -/+</label>
          <div className="volume">
            <input
              className="slider"
              type="range"
              value={volume}
              min="-10"
              max="0"
              onChange={(e) => {
                setVolume(parseInt(e.target.value))
              }}
            />
          </div>
        </div>
        <div className="bottom">
          <div className={`keys flats`}>
            {octaves.map((octave) =>
              flats.map((key) => (
                <div
                  className={`key ${key.replace("#", "sharp") + octave}`}
                  key={`${key}${octave}`}
                  onMouseDown={() => {
                    onKeyDown(`${key}${octave}`)
                  }}
                  onMouseUp={() => {
                    onKeyUp(`${key}${octave}`)
                  }}
                >
                  {key}
                  {octave}
                </div>
              )),
            )}
            <div
              className={`key C${octaves[octaves.length - 1] + 1}`}
              key={`C${octaves[octaves.length - 1] + 1}`}
              onMouseDown={() => {
                onKeyDown(`C${octaves[octaves.length - 1] + 1}`)
              }}
              onMouseUp={() => {
                onKeyUp(`C${octaves[octaves.length - 1] + 1}`)
              }}
            >
              {"C"}
              {octaves[octaves.length - 1] + 1}
            </div>
          </div>
          <div className="keys sharps">
            {octaves.map((octave) =>
              sharps.map((key, i) =>
                key ? (
                  <div
                    className={`key sharp ${
                      key.replace("#", "sharp") + octave
                    }`}
                    key={`${key}${octave}`}
                    onMouseDown={() => {
                      onKeyDown(`${key}${octave}`)
                    }}
                    onMouseUp={() => {
                      onKeyUp(`${key}${octave}`)
                    }}
                  >
                    {key}
                    {octave}
                  </div>
                ) : (
                  <div className="key blank" key={i} />
                ),
              ),
            )}
            <div className="key blank" />
            <div className="key blank" />
          </div>
        </div>
      </div>
    </div>
  )
}
