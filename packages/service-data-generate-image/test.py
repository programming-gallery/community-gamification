import datetime
import numpy as np
import pickle
import os
import math
import datetime
from nlp.model import Model
from nlp.athena import saveCorpusByGalleryId, saveCorpus
if __name__ == "__main__":
    corpuspath = '/tmp/corpus.txt'
    gallerycorpusdir = '/tmp/gallery-corpuses'
    modeldir = 'nlp/models/test-model'
    #saveCorpus(corpuspath)
    #saveCorpusByGalleryId(gallerycorpusdir)
    model = Model(override=False)
    model.load(modeldir)
    #print(model.tag('레디컬 페미니스트', stem=True))
    print([t for t in model.doc2vec.docvecs.most_similar('hansolgeun', topn=1000)])# if t[0].startswith('gallery')])
    #print(model.doc2vec.docvecs.most_similar(1))
    #print(model.word2vec.wv.most_similar(positive=['이명박#NNP'], negative=[], topn=100))
    #print(model.word2vec.wv.most_similar(positive=['엄마#NNG', '보지#NNG'], negative=['아빠#NNP'], topn=100))
    #l = ['박근혜#NNP', '문재인#NNP', '이명박#NNP', '박정희#NNP', '노무현#NNP']
    #v = np.average(np.array([model.word2vec.wv.get_vector(i) for i in l]), axis=0)
    #print(v)
    #print(model.word2vec.wv.similar_by_vector(v))
    #print(model.word2vec.wv.similarity('엄마#NNG', '아빠#NNG'))
    #print([i for i in model.word2vec.wv.most_similar(positive=['경상도#NNP'], negative=[], topn=1000) if i[0].split('#')[-1].startswith('V')])
    #print(model.word2vec.wv.closer_than('C++#NNP', '자바#NNP'))
    #print(model.word2vec.similar_by_vector('공포#NNP', topn=100))
    '''
    model.load(modeldir)
    morphpath = os.path.join(modeldir, 'morphs.pkl')
    gallerymorphdir = os.path.join(modeldir, 'gallery-morphs')
    if not os.path.exists(gallerymorphdir):
        os.mkdir(gallerymorphdir)
    print(datetime.datetime.now(), "save morph..")
    with open(corpuspath) as hin:
        with open(morphpath, 'wb') as hout:
            pickle.dump([model.tag(line, stem=True) for line in hin], hout)
    print(datetime.datetime.now(), "save morph by gallery..")
    for f in os.listdir(gallerycorpusdir):
        gallery = f.split('.')[0]
        with open(os.path.join(gallerycorpusdir, f)) as hin:
            with open(os.path.join(gallerymorphdir, gallery + '.pkl'), 'wb') as hout:
                pickle.dump([model.tag(line, stem=True) for line in hin], hout)
    '''
    print(datetime.datetime.now(), "done")

    #model.__updateMecabDictionary()
