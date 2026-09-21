import sys
import os

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "python-service"))
from pipeline.itn import apply_itn

test_cases = [
    # 0 tests (all languages & colloquial)
    ("મોબાઇલ નંબર શૂન્ય શુન્ય મીંડું ઝીરો", "0000"),
    ("खाता संख्या शून्य सुन्ना बिंदी ज़ीरो", "0000"),
    ("contact number zero oh naught nil cipher", "00000"),
    ("phone shunya mindu sifar zeero", "0000"),

    # 1 tests
    ("આધાર એક એકા એકડો પેલો વન", "11111"),
    ("आधार एक एका इक्का पहला वन", "11111"),
    ("Aadhaar one single first won unit", "11111"),
    ("ref ek ekko pehla van", "1111"),

    # 2 tests
    ("નંબર બે ભે બગડો બીજો દો", "22222"),
    ("नंबर दो दू दूजा दूसरा टू", "22222"),
    ("number two pair dual second", "2222"),
    ("ref be bey bagdo dono", "2222"),

    # 3 tests
    ("નંબર ત્રણ ત્રન તરન ટ્રન પ્રન તગડો ત્રીજો થ્રી", "33333333"),
    ("नंबर तीन तिन तीजा तीसरा थ्री", "33333"),
    ("number three third tree", "333"),
    ("ref tran taran tagdo teen", "3333"),

    # 4 tests
    ("નંબર ચાર ચવ ચ્યા ચ઼ ચ્યાર ચોગડો ચોથો ફોર", "44444444"),
    ("नंबर चार चौथा चौका चतुर्थ फोर", "44444"),
    ("number four fourth quad", "444"),
    ("ref char chaar chov chogdo", "4444"),

    # 5 tests
    ("નંબર પાંચ પાચ પાંસ પાંચડો પાંચમો ફાઇવ", "555555"),
    ("नंबर पांच पाँच पाच पांचवा पंचम फाइव", "555555"),
    ("number five fifth", "55"),
    ("ref panch paanch paans panchdo", "5555"),

    # 6 tests
    ("નંબર છ છહ ચ્ષ છગડો છઠ્ઠો સિક્સ", "666666"),
    ("नंबर छह छः छ छठा छक्का सिक्स", "666666"),
    ("number six sixth", "66"),
    ("ref chhe che chhagdo chhatho", "6666"),

    # 7 tests
    ("નંબર સાત સાથ સાતડો સાતમો સેવન", "77777"),
    ("नंबर सात साथ सातवां सप्तम सेवन", "77777"),
    ("number seven seventh", "77"),
    ("ref saat sat saath saatdo", "7777"),

    # 8 tests
    ("નંબર આઠ આધ આદ આત આચ અદ અઠ અધ આઠડો આઠમો એટ", "88888888888"),
    ("नंबर आठ आध आद आत आच अद अठ अध आठवां एट", "8888888888"),
    ("number eight eighth ate", "888"),
    ("ref aath ath aad aathdo", "8888"),

    # 9 tests
    ("નંબર નવ નૂવ નવજ અવ અૂવ નવડો નવમો નાઇન", "99999999"),
    ("नंबर नौ नूव नूवे नवा नौवां नवम नाइन", "9999999"),
    ("number nine ninth", "99"),
    ("ref nau nav noov navdo", "9999"),

    # Native Indic Numeral Glyphs (૦-૯ / ०-९)
    ("ગુજરાતી અંક ૯૮૭૬૫૪૩૨૧૦", "9876543210"),
    ("देवनागरी अंक ९८७६५४३२१०", "9876543210"),

    # Repetition phrases & Multipliers
    ("phone double nine triple eight quadruple seven", "998887777"),
    ("મોબાઇલ ડબલ પાંચ ત્રિપલ ત્રણ ચાર વાર બે", "553332222"),
    ("खाता संख्या डबल नौ ट्रिपल आठ दो बार एक", "9988811"),

    # Complex real-world sentences
    ("નક્લી સીમ કાડ માતે મોબાલ નમવ અવ અદ 1122, ત્રન, ત્રન 44 ઉપ્યોગ થાયો હતો", "9811223344"),
    ("બેંક ખાતા નંબર 5544, તરન, તરન, ભે, ભે, 1, 1, શુન્યક, શુન્યમા ક્રિપ્તો ફન ત્રાન સફર થાયાશે", "554433221100"),
    ("case number FIR twenty twenty-six ninety-nine forty-one", "FIR 20269941"),
    ("victim bank account ninety eight seventy six fifty four thirty two ten twelve", "987654321012")
]

print("=" * 75)
print("EXHAUSTIVE 0-9 ITN MULTI-LANGUAGE TEST SUITE")
print("=" * 75)
all_passed = True
for idx, (inp, exp) in enumerate(test_cases, 1):
    res = apply_itn(inp)
    passed = exp in res
    if not passed:
        all_passed = False
    status_str = "[PASS]" if passed else "[FAIL]"
    print(f"{idx:02d}. {status_str} Expected: {exp:<15} | Got: {res}")

print("\n" + "=" * 75)
if all_passed:
    print(f"RESULT: ALL {len(test_cases)} EXHAUSTIVE TEST CASES PASSED PERFECTLY!")
else:
    print("RESULT: SOME TEST CASES FAILED!")
print("=" * 75)
