from tokenizers import (ByteLevelBPETokenizer,
        CharBPETokenizer,
        SentencePieceBPETokenizer,
        BertWordPieceTokenizer)

# Initialize a tokenizer
#tokenizer = ByteLevelBPETokenizer('byte-level-bpe-tokenizer-vocab.json', 'byte-level-bpe-tokenizer-merges.txt')
bertTokenizer = BertWordPieceTokenizer( 'model/bert-tokenizer-vocab.txt', )
charTokenizer = CharBPETokenizer('model/char-bpe-tokenizer-vocab.json', 'model/char-bpe-tokenizer-merges.txt')
stpTokenizer = SentencePieceBPETokenizer('model/stp-bpe-tokenizer-vocab.json', 'model/stp-bpe-tokenizer-merges.txt')
byteTokenizer = ByteLevelBPETokenizer('model/char-bpe-tokenizer-vocab.json', 'model/char-bpe-tokenizer-merges.txt')

sentence = "안녕하세요ㅋㅋ미친새끼네이거C++파이썬소감코로나구글기프티콘자바java"

# Now, let's use it:
print(bertTokenizer.encode(sentence, add_special_tokens=False).tokens)
print(charTokenizer.encode(sentence, add_special_tokens=False).tokens)
print(stpTokenizer.encode(sentence, add_special_tokens=False).tokens)
print(byteTokenizer.encode(sentence).tokens)
