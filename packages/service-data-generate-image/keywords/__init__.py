import math
import os
import datetime
import re
from pyathena import connect

import gallery_index
import mobile_ip
import datastore

import pke

KEY = 'keywords'

def log(msg):
    print(datetime.datetime.now(), '|', msg)

def saveTitles(duration_in_days = 30):
    cursor = connect(work_group='primary').cursor()
    min_date_with_hours = (datetime.datetime.utcnow() - datetime.timedelta(days=duration_in_days)).strftime('%Y-%m-%d-%H')
    now = datetime.datetime.utcnow().strftime('%Y-%m-%d-%H')
    savepath = os.path.join('staging', 'title_' + min_date_with_hours + '_' + now + '.txt')
    if os.path.exists(savepath):
        log("find staging file. load it..")
        return savepath
    #mobile_users = ['ㅇㅇ#%s' % ip for ip in mobile_ips]
    cursor.execute(f"""
      SELECT
        title
      FROM cg_dev.dcinside_document
      WHERE dateWithHours >= '{min_date_with_hours}' AND title IS NOT NULL;
    """)
    res = cursor.fetchall()
    with open(savepath, 'w') as f:
        f.write('\n'.join(row[0] for row in res))
    return savepath

from soynlp.utils import DoublespaceLineCorpus
from soynlp.noun import LRNounExtractor_v2
def extractNouns(corpus_path):
    sents = DoublespaceLineCorpus(corpus_path, iter_sent=True)
    noun_extractor = LRNounExtractor_v2(verbose=True)
    nouns = noun_extractor.train_extract(sents)
    return nouns

def getKeywords(corpus_path):
    extractor = pke.unsupervised.TextRank()
    extractor.load_document(input=inputpath, language='ko')
    extractor.candidate_weighting(window=2, pos=['NOUN', 'PROPN', 'ADJ'], top_percent=0.33)
    keywords = extractor.get_n_best(n=10)
    return keywords

def put():
    log("load titles..")
    inputpath = saveTitles()
    log("start extract keyword..")
    #keywords = getKeywords()
    print(keywords)
    #datastore.put(KEY, data)

def get():
    return datastore.get(KEY)
