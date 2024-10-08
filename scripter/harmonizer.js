//*********************** Copyright © 2024 Jonathon Bell. All rights reserved.
//*
//*
//*  Version : $Header:$
//*
//*
//*  Purpose : Harmonizes pitches using a specified scale and chord voicing.
//*
//*            The GUI specifies a Scale as:
//*
//*              a Root note, represented as an integer in the range [0, 12).
//*
//*              a Scale Type, represented as a sequence of positive integers
//*              that sums to 12.
//*
//*            and a Chord Voicing as a set of Voices, each comprising:
//*
//*              a Degree, represented as a positive integral number of scale
//*              steps to transpose the incoming pitch by.
//*
//*              an Octave, an integral offset
//*
//*  See Also: https://www.musios.app/logic-pro-scripter/
//*            for an alternate description of the Logic Pro Scripter API.
//*                                                                     0-0
//*                                                                   (| v |)
//**********************************************************************w*w***

const scales =
[
// Chromatic

  [[1,1,1,1,1,1,1,1,1,1,1,1], "Chromatic"                                   ],

// Symmetric Diminished

  [[2,1,2,1,2,1,2,1],         "Whole Half"                                  ],
  [[1,2,1,2,1,2,1,2],         "Half Whole"                                  ],

// Diatonic

  [[2,2,1,2,2,2,1],           "Ionian, Major"                               ],
  [[2,1,2,2,2,1,2],           "Dorian"                                      ],
  [[1,2,2,2,1,2,2],           "Phrygian"                                    ],
  [[2,2,2,1,2,2,1],           "Lydian"                                      ],
  [[2,2,1,2,2,1,2],           "Myxolydian"                                  ],
  [[2,1,2,2,1,2,2],           "Aeolian, Minor"                              ],
  [[1,2,2,1,2,2,2],           "Locrian"                                     ],

// Melodic Minor

  [[2,1,2,2,2,2,1],           "Melodic Minor"                               ],
  [[1,2,2,2,2,1,2],           "Dorian ♭2, Phrygian ♮6"                      ],
  [[2,2,2,2,1,2,1],           "Lydian ♯5, Lydian Augmented"                 ],
  [[2,2,2,1,2,1,2],           "Lydian ♭7, Lydian Dominant"                  ],
  [[2,2,1,2,1,2,2],           "Mixolydian ♭6, Melodic Major"                ],
  [[2,1,2,1,2,2,2],           "Dorian ♭5, Locrian ♮2, Half Diminished"      ],
  [[1,2,1,2,2,2,2],           "Altered Dominant, Superlocrian"              ],

// Harmonic Minor

  [[2,1,2,2,1,3,1],           "Harmonic Minor"                              ],
  [[1,2,2,1,3,1,2],           "Locrian ♯6"                                  ],
  [[2,2,1,3,1,2,1],           "Ionian ♯5, Ionian Augmented"                 ],
  [[2,1,3,1,2,1,2],           "Dorian ♯4, Romanian"                         ],
  [[1,3,1,2,1,2,2],           "Phrygian ♯3, Phrygian Dominant"              ],
  [[1,2,1,2,2,1,3],           "Myxolydian ♯1, Ultralocrian"                 ],
  [[3,1,2,1,2,2,1],           "Lydian ♯2"                                   ],

// Double Harmonic

  [[1,3,1,2,1,3,1],           "Double Harmonic, Arabic, Gypsy, Byzantine"   ],
  [[3,1,2,1,3,1,1],           "Lydian ♯2 ♯6"                                ],
  [[1,2,1,3,1,1,3],           "Ultraphrygian"                               ],
  [[2,1,3,1,1,3,1],           "Hungarian Minor"                             ],
  [[1,3,1,1,3,1,2],           "Oriental"                                    ],
  [[3,1,1,3,1,2,1],           "Ionian Augmented ♯2"                         ],
  [[1,1,3,1,2,1,3],           "Locrian 𝄫3 𝄫7"                               ],

// Hexatonic

  [[2,2,2,2,2,2],             "Whole Tone"                                  ],
  [[2,2,2,3,1,2],             "Prometheus"                                  ],
  [[3,1,3,1,3,1],             "Augmented"                                   ],
  [[1,2,3,1,3,2],             "Tritone"                                     ],
  [[3,2,1,1,3,2],             "Blues"                                       ],

// Pentatonic

  [[2,2,3,2,3],               "Major Pentatonic"                            ],
  [[2,3,2,3,2],               "Suspended Pentatonic, Egyptian"              ],
  [[3,2,3,2,2],               "Blues Minor Pentatonic, Man Gong"            ],
  [[2,3,2,2,3],               "Blues Major Pentatonic, Ritusen"             ],
  [[3,2,2,3,2],               "Minor Pentatonic"                            ],
];

const voices  = 6;
var   chords  = undefined;
var   dirty   = false;

function HandleMIDI(e)
{
  if (e instanceof Note)
  {
    const p = e.pitch;

    for (const i of chords.get(p % 12))
    {
      e.pitch = p + i;
      e.send();
    }
  }
  else
  {
    e.send();
  }
}

function ParameterChanged(_, _)
{
  dirty = true;
}

function Idle()
{
  if (dirty)
  {
    const r = scale_root();
    const s = scale_type();
    let   n = r;
    let   m = "";

    chords  = new Map(Array.from({length: 12}, (_, i) => [i, []]));
    dirty   = false;

    for (let i = 0; i !== s.length; ++i)
    {
      const c = chords.get(n);

      for (let v = 0; v !== voices; ++v)
      {
        if (voice_enabled(v))
        {
          c.push(sum(s, i, i + voice_degree(v)) + voice_octave(v));
        }
      }

      m += " " + note_name(n, r);
      n += s[i]
      n %= 12;
    }

    PluginParameters[2].valueStrings = [m, "", ""];

    if (s.length !== PluginParameters[3 + voices].maxValue)
    {
      for (let p = 3 + voices; p !== 3 + 2 * voices; ++p)
      {
        PluginParameters[p].maxValue      = s.length;
        PluginParameters[p].numberOfSteps = s.length - 1;
      }
    }

    UpdatePluginParameters();
  }
}

//****************************************************************************

var PluginParameters =
[
  {
    name:           "Scale Root",
    type:           "menu",
    valueStrings:   ["C", "C♯, D♭", "D", "D♯, E♭", "E", "F", "F♯, G♭", "G", "G♯, A♭", "A", "A♯, B♭", "B"],
    defaultValue:   0,
  }
  ,
  {
    name:           "Scale Type",
    type:           "menu",
    valueStrings:   scales.map((s, _) => s[1]),
    defaultValue:   0,
  }
  ,
  {
    name:           "Scale Notes",
    type:           "menu",
    valueStrings:   ["", "", ""],
    defaultValue:   0,
    readOnly:       true,
  }
];

for (let v = voices; v > 0; --v)
{
  PluginParameters.push(
  {
    name:           voice_parameter_name(v-1, "Octave"),
    type:           "menu",
    valueStrings:   ["+2", "+1", "0", "-1", "-2", "Off"],
    defaultValue:   v === 1 ? 2 : 5,
  });

}

for (let v = voices; v > 0; --v)
{
  PluginParameters.push(
  {
    name:           voice_parameter_name(v-1, "Degree"),
    type:           "lin",
    minValue:       1,
    maxValue:       12,
    numberOfSteps:  11,
    defaultValue:   0,
  });
}

//****************************************************************************

function scale_root()
{
  return GetParameter(0);
}

function scale_type()
{
  return scales[GetParameter(1)][0];
}

function voice_enabled(v)
{
  return voice_parameter(v, "Octave") < 5;
}

function voice_octave(v)
{
  return [+24, +12, 0, -12, -24][voice_parameter(v, "Octave")];
}

function voice_degree(v)
{
  return voice_parameter(v, "Degree") - 1;
}

function voice_parameter_index(v, p)
{
  return 3
       + (p === "Degree" ? voices : 0)
       + (voices - v - 1)
}

function voice_parameter(v, p)
{
  return GetParameter(voice_parameter_index(v, p));
}

function voice_parameter_name(v, p)
{
  return "Voice " + (v + 1) + " " + p;
}

function note_name(n, r = 0)
{
  return [
    ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"],
    ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"],
  ][1322 & (1 << r % 12) ? 1 : 0][n % 12];
}

/**
 * Sums the elements of the given array with indices in the range '[i, j)'.
 *
 * Indices 'wrap around' at the end of the array.
 *
 * For example:
 *
 *  sum([1, 2, 3], 0, 2)   ==   1 + 2
 *
 *  sum([1, 2, 3], 1, 2)   ==   2
 *
 *  sum([1, 2, 3], 0, 4)   ==   1 + 2 + 3 + 1
 *
 * @param  a  An array of integers.
 * @param  i  An index to sum from.
 * @param  j  An index to sum to.
 *
 * @return The sum of the elements of 'a' with indices in the range '[i, j)'.
 */
function sum(a, i, j)
{
  let s = 0;

  while (i !== j)
  {
    s += a[i++ % a.length];
  }

  return s;
}

//****************************************************************************
