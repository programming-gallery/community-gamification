import os
def normalize(str):
    12619
    return ''.join(c for c in str if 32 <= ord(c) <= 126 or 0xAC00 <= ord(c) <= 0xD7A3 or 12593 <= ord(c) <= 12643).strip()
    '''
    str = str.strip()
    cCho = [ 'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ' ]
    cJung = [ 'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ' ]
    cJong = [ '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ' ]
    chars = []
    for char in str:
        cCode = ord(char)
        if cCode >= 32 and cCode <= 126:
            chars.append(char)
            continue
        elif cCode < 0xAC00 or cCode > 0xD7A3: 
            continue
        cCode = ord(char) - 0xAC00
        jong = cCode % 28
        jung = ((cCode - jong) // 28 ) % 21
        cho = (((cCode - jong) // 28 ) - jung ) // 21
        chars.append(cCho[cho]) 
        chars.append(cJung[jung])
        if cJong[jong] != '': 
            chars.append(cJong[jong])
    return ''.join(chars) 
    '''

arr = [os.path.join('dataset', p) for p in os.listdir('dataset') if p.endswith('csv')]
for p in arr:
    with open(p, 'r') as f:
        with open(p.replace('csv', 'txt'), 'w') as f2:
            f2.write('\n'.join(filter(None, (normalize(line[1:-1]) for line in f.read().split('\n')[1:]))))
