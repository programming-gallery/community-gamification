import math
import os
import datetime
import re
import pickle
import MeCab
import numpy as np

from soyspacing.countbase import CountSpace
from soynlp.noun import LRNounExtractor_v2
from soynlp.utils import DoublespaceLineCorpus
from soynlp.normalizer import *

from gensim.corpora.dictionary import Dictionary
from gensim.models.word2vec import Word2Vec
from gensim.models.doc2vec import Doc2Vec, TaggedDocument
from gensim.models.ldamodel  import LdaModel
from gensim.models.nmf import Nmf
from gensim.models.phrases import Phrases, Phraser

import guidedlda
from scipy.sparse import lil_matrix


KEY = 'tagger'

MECAB_KO_DIC_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), 'thirdparty/mecab-ko-dic-2.1.1-20180720'))

print(MECAB_KO_DIC_PATH)

class Model:
    def __init__(self, override=False):
        self.spacer = CountSpace()
        self.nouns = None
        self.override = override
        self.tagger = MeCab.Tagger(f'-d {MECAB_KO_DIC_PATH}')
        self.word2vec = None
    def __trainNormalizer(self, documentpaths):
        tmp = os.path.join('/tmp', 'mergeddocuments.txt')
        with open(tmp, 'w') as hout:
            for fout in documentpaths:
                with open(fout) as hin:
                    hout.write(hin.read() + '\n')
        self.spacer.train(tmp)
    def __normalize(self, text):
        text = repeat_normalize(text, num_repeats=3)
        text, _ = self.spacer.correct(text)
        return text
    def __extractNouns(self, corpuspath):
        return nouns, compound_nouns
    def __trainTokenizer(self, documentpaths, minnounscore=0.3, minnounfreq=10):
        lines = []
        for fout in documentpaths:
            with open(fout) as hin:
                for line in hin:
                    lines.append(self.__normalize(line))
        print('len', len(lines))
        print('ex', lines[0])
        noun_extractor = LRNounExtractor_v2(verbose=True)
        self.nouns = noun_extractor.train_extract(lines)
        self.compound_nouns = noun_extractor._compounds_components
        with open(os.path.join(MECAB_KO_DIC_PATH, 'user-dic/dcinside.csv'), 'w') as f:
            for noun in [noun[0] for noun in self.nouns.items() if noun[1].frequency >= minnounfreq and noun[1].score >= minnounscore]:
                if '"' in noun or "'" in noun or ',' in noun:
                    continue
                tokenofnoun = self.tag(noun, stem=True)
                if len(tokenofnoun) == 1 and tokenofnoun[0][1] != 'UNKNOWN':
                    continue
                fin = 'T' if (ord(noun[-1])-44032)%28 > 0 else 'F'
                compound = '+'.join(n + '/NNP/*' for n in self.compound_nouns.get(noun, [])) or '*'
                is_compound = 'Compound' if compound != '*' else '*'
                f.write(f'{noun},,,,NNP,*,{fin},{noun},{is_compound},*,*,{compound}\n')
        import subprocess
        subprocess.call([os.path.join(MECAB_KO_DIC_PATH, 'tools/add-userdic.sh')])
        os.system(f'cd {MECAB_KO_DIC_PATH} && sudo make install')
    def __tokenize(self, text, filter=None):
        if filter:
            return ['#'.join(t) for t in self.tag(text, stem=True) if t[1] in filter]
        return ['#'.join(t) for t in self.tag(text, stem=True)]
    def __symantics(self, text):
        return ['#'.join(t) for t in self.tag(text, symantic=True)]
    def trainWord2Vec(self, documentpaths):
        lines = []
        for fout in documentpaths:
            with open(fout) as hin:
                for line in hin:
                    lines.append(self.__tokenize(line))
        print('w2v input ex:', lines[0])
        self.word2vec = Word2Vec(lines, size=100, window=20, workers=8, sg=1)
    def trainDoc2Vec(self, documentpaths, tags):
        lines = []
        lineIndexTotag = []
        print("tokenize..")
        for fout, tag in zip(documentpaths, tags):
            with open(fout) as hin:
                for line in hin:
                    lines.append(self.__tokenize(line))
                    lineIndexTotag.append(tag)
        print("join phrase..")
        phrases = Phrases(lines)
        taggedlines = []
        for line, tag in zip(lines, lineIndexTotag):
            taggedlines.append(TaggedDocument(phrases[line], tag))
        print('d2v input ex:', taggedlines[0])
        print("start doc2vec training..")
        self.doc2vec = Doc2Vec(taggedlines, vector_size=100, window=20, workers=8, dm=0)
    def genSTMMTrainingSet(self, documentpaths, outpath):
        lines = []
        for fout in documentpaths:
            with open(fout) as hin:
                for line in hin:
                    lines.append(self.__tokenize(line, ('NNG', 'NNP', 'VV', 'VA', 'MAG', 'IC')))#['NNG', 'NNP']))
        phrases = Phrases(lines)
        print("docs:", len(lines))
        print("first doc:", lines[0])
        with open(outpath, 'w') as f:
            f.write('\n'.join(' '.join(phrases[line]) for line in lines))
    def genBigartmTrainingSet(self, documentpaths, outpath):
        lines = []
        for fout in documentpaths:
            with open(fout) as hin:
                for line in hin:
                    lines.append(self.__tokenize(line, ('NNG', 'NNP', 'VV', 'VA', 'MAG', 'IC')))#['NNG', 'NNP']))
                    #lines.append(self.__tokenize(line, ['NNG', 'NNP']))
        phrases = Phrases(lines)
        print("docs:", len(lines))
        print("first doc:", lines[0])
        lines = [phrases[line] for line in lines]
        dictionary = Dictionary()
        dictionary.add_documents(lines)
        #lines = [dictionary.doc2idx(l) for l in lines]
        lines = [dictionary.doc2bow(l) for l in lines]
        print('first parsed doc:', lines[0])
        with open(outpath, 'w') as f:
            f.write(str(len(lines)) + '\n')
            f.write(str(len(dictionary)) + '\n')
            f.write(str(len(dictionary)*len(lines)) + '\n')
            f.write('\n'.join(f'{i+1} {w+1} {f}' for i, l in enumerate(lines) for w, f in l))
            #f.write('\n'.join(' '.join(map(lambda t: str(t+1), line)) for line in lines))
        with open(outpath + '.vocab', 'w') as f:
            f.write('\n'.join(dictionary.itervalues()))
    def topicModeling(self, documentpaths, num_topics=10):
        lines = []
        for fout in documentpaths:
            with open(fout) as hin:
                for line in hin:
                    lines.append(self.__tokenize(line, ['NNG', 'NNP']))
        phrases = Phrases(lines)
        lines = [phrases[line] for line in lines]
        print("docs:", len(lines))
        dictionary = Dictionary()
        dictionary.add_documents(lines)
        lines = [dictionary.doc2idx(l) for l in lines]
        X = lil_matrix((len(lines), len(dictionary)), dtype=np.int32)
        for i, l in enumerate(lines):
            X[i, l] = 1
        #lda = LdaModel([dictionary.doc2bow(l) for l in lines], num_topics=num_topics, id2word=dictionary)
        #lda = Nmf(, num_topics=num_topics, id2word=dictionary)# chunksize=100)
        model = guidedlda.GuidedLDA(n_topics=5, n_iter=100, random_state=7, refresh=20)
        model.fit(X)
        return [[(dictionary[k], topic_dist[k]) for k in np.argsort(topic_dist)[::-1]] for i, topic_dist in enumerate(model.topic_word_)]
    def train(self, documentpaths, tags, minnounscore=0.3, minnounfreq=10):
        print(datetime.datetime.now(), 'train normalizer..')
        #self.__trainNormalizer(documentpaths)
        print(datetime.datetime.now(), 'train tokenizer..')
        #self.__trainTokenizer(documentpaths, minnounscore, minnounfreq)
        #print('train word2vec..')
        #self.trainWord2Vec(documentpaths)
        self.trainDoc2Vec(documentpaths, tags)
        #self.__trainWord2Vec(documentpaths)
    def load(self, dir):
        with open(os.path.join(dir, 'nouns.pkl'), 'rb') as f:
            self.nouns = pickle.load(f)
        with open(os.path.join(dir, 'compound-nouns.pkl'), 'rb') as f:
            self.compound_nouns = pickle.load(f)
        self.spacer.load_model(os.path.join(dir, 'soyspace'), json_format=False)
        self.word2vec = Word2Vec.load(os.path.join(dir, 'word2vec.model'))
        self.doc2vec = Doc2Vec.load(os.path.join(dir, 'doc2vec.model'))
        #self.dictionary = Dictionary.load(os.path.join(dir, 'dictionary.gensim'))
    def save(self, dir):
        try:
            os.mkdir(dir)
        except OSError as error: 
            pass
        self.spacer.save_model(os.path.join(dir, 'soyspace'), json_format=False)
        with open(os.path.join(dir, 'nouns.pkl'), 'wb') as f:
            pickle.dump(self.nouns, f)
        with open(os.path.join(dir, 'compound-nouns.pkl'), 'wb') as f:
            pickle.dump(self.compound_nouns, f)
        self.word2vec.save(os.path.join(dir, 'word2vec.model'))
        self.doc2vec.save(os.path.join(dir, 'doc2vec.model'))
        #self.dictionary.save(os.path.join(dir, 'dictionary.gensim'))
    def tag(self, s, stem=False, symantic=False):
        #symantics = set(('NNG', 'NNP', 'NNB', 'NR', 'NP', 'VV', 'VA', 'VX', 'VCP', 'VCN', 'MM', 'MAG', 'MAJ', 'IC'))
        s = repeat_normalize(s, num_repeats=3)
        s, _ = self.spacer.correct(s)
        symantictags = set(('NNG', 'NNP', 'VV', 'VA', 'MAG', 'IC'))
        res = []
        for line in self.tagger.parse(s).split('\n')[:-2]:
            word, rest = line.split('\t')
            args = rest.split(',')
            if (stem == True or symantic == True) and args[4] == 'Inflect':
                for sub in args[-1].split('+'):
                    res.append(tuple(sub.split('/')[:2]))
            else:
                res.append((word, args[0]))
        if symantic:
            return [i for i in res if i[1] in symantictags]
        else:
            return res

if __name__ == "__main__":
    model = Model(override=False)
    #model.train('staging/title_2020-07-18-20_2020-08-17-20.txt')
    #model.save('test-model')
    model.load('../test-model')
    model.train()
    #model.updateMecabDictionary(minnounscore=0.3, minnounfreq=10)
    print(model.tag("C#이 최고인 이유 전독시 재밌네 ㅋㅋ abcdef 좆목질하지마 ㅡㅡ ⚔MONSTER⚔ 성공한야붕이 핑크 핑 핑 핑크색", stem=True))
    #print(model.tag("배고플지어다", stem=True))
