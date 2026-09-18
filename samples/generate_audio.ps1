Add-Type -AssemblyName System.Speech
 = New-Object System.Speech.Synthesis.SpeechSynthesizer
.SetOutputToWaveFile('samples/sample_case_sim_swapping.wav')
.Speak('State Cyber Cell operational briefing. Inspector Shinde presiding. Reviewing case FIR-2026-9941 regarding unauthorized SIM swapping. Target victim lost 4 Lakhs from Bank Account 987654321012 with IFSC SBIN0001234. Suspect contact number is 9876543210. Subpoena CDR logs from telecom provider and freeze beneficiary account under Section 91 CrPC immediately.')
.SetOutputToWaveFile('samples/sample_case_ransomware.wav')
.Speak('Technical incident response meeting. Lead Analyst Patil reporting on LockBit ransomware breach at Civil Hospital servers. Cyber ticket CY-2026-8812. Isolate affected network segment. Perform memory dump analysis and contact CERT-In.')
.SetOutputToWaveFile('samples/sample_case_crypto_extortion.wav')
.Speak('Cyber investigation review for case FIR-2026-4421. Officer Deshmukh reporting on cryptocurrency extortion scam. Stolen funds routed across USDT wallet addresses. Issue emergency compliance freeze notice to crypto exchange.')
.Dispose()
