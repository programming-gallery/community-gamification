import datetime
import pickle
import os
import math
import datetime
from nlp.model import Model
from nlp.athena import saveCorpusByGalleryIdAndUserId
if __name__ == "__main__":
    #corpuspath = '/tmp/corpus.txt'
    corpusdir = '/tmp/corpuses'
    modeldir = 'nlp/models/test-model'
    #saveCorpus(corpuspath)
    #saveCorpusByGalleryId(gallerycorpusdir)
    print(datetime.datetime.now(), "fetch corpus by athena")
    #saveCorpusByGalleryIdAndUserId(corpusdir)
    corpuspaths = [os.path.join(corpusdir, gall, user) for gall in os.listdir(corpusdir) for user in os.listdir(os.path.join(corpusdir, gall))]
    tags = [['gallery:'+gall, user.split(".txt")[0]] for gall in os.listdir(corpusdir) for user in os.listdir(os.path.join(corpusdir, gall))]
    model = Model(override=False)
    try:
        model.load(modeldir)
    except Exception as e:
        print(e)
    print(datetime.datetime.now(), "train start")
    #model.train(corpuspaths)
    model.trainDoc2Vec(corpuspaths, tags)
    print(datetime.datetime.now(), "save model")
    model.save(modeldir)
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
