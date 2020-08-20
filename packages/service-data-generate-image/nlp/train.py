import datetime
import os
import math
from nlp.model import Model
from nlp.athena import saveCorpusByGalleryId, saveCorpus
if __name__ == "__main__":
    corpuspath = saveCorpus('/tmp/corpus.txt')
    saveCorpusByGalleryId('/tmp/gallery-corpuses')
    model = Model(override=False)
    model.train(corpuspath)
    model.save('test-model')
    #model.load('test-model')
    #model.__updateMecabDictionary()
    print(model.tag("삶, 그러나 인생, 그리고 너와 나", stem=True))
    print(model.tag("삶, 그러나 인생, 그리고 너와 나", symantic=True))
