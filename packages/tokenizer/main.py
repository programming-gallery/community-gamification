from tokenizers import (ByteLevelBPETokenizer,
        CharBPETokenizer,
        SentencePieceBPETokenizer,
        BertWordPieceTokenizer)
from tokenizers import normalizers, pre_tokenizers
#tokenizer = Tokenizer(models.BPE())

# Initialize a tokenizer
tokenizer1 = BertWordPieceTokenizer()
tokenizer2 = CharBPETokenizer()
tokenizer3 = SentencePieceBPETokenizer()
tokenizer4 = ByteLevelBPETokenizer()

# Then train it!
import os
inputs = [os.path.join('dataset', p) for p in os.listdir('dataset') if p.endswith('.txt')]
tokenizer1.train(inputs)
tokenizer2.train(inputs)
tokenizer3.train(inputs)
tokenizer4.train(inputs)

# And finally save it somewhere
tokenizer1.save_model("./model/", "bert-tokenizer")
tokenizer2.save_model("./model/", "char-bpe-tokenizer")
tokenizer3.save_model("./model/", "stp-bpe-tokenizer")
tokenizer4.save_model("./model/", "byte-bpe-tokenizer")
