import { compileCircuitMission, validateCircuitMission, isCircuitDomain } from "./backend/server/lib/arena/missionCompiler.js"
let pass=0, fail=0
for (let i=0;i<400;i++){ try{ compileCircuitMission({ eloGain: 12 }); pass++ }catch(e){ fail++; if(fail<4) console.log("FAIL:",e.message) } }
console.log(`compiled ${pass+fail}: pass=${pass} fail=${fail}`)
const s=compileCircuitMission({templateId:"voltage_divider",eloGain:12})
console.log("\nSAMPLE voltage_divider:")
console.log(" workstation:",s.workstation,"| target:",JSON.stringify(s.simulation.target))
console.log(" components:",s.simulation.circuit.components.map(c=>`${c.id}=${c.value}${c.unit||''}${c.editable?'(edit)':''}`).join(", "))
console.log(" probe:",s.simulation.circuit.probe)
console.log(" isCircuitDomain(ece,Voltage Divider):",isCircuitDomain("ece","Voltage Divider"),"| (swe,React):",isCircuitDomain("swe","React app"))
