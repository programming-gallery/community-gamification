import os
import json
import requests
import re
import datastore

KEY = 'gallery-index'

def getMajorGalleryIndex():
    major = requests.get('https://m.dcinside.com/galltotal')
    return re.findall(r'<a href="https://m.dcinside.com/board/([^"]+)">([^<]+)<', major.text)
def getMinorGalleryIndex():
    res = requests.get('https://m.dcinside.com/mcategory')
    cates = re.findall(r'<a href="https://m.dcinside.com/mcategory/([^"]+)"', res.text)
    reses = []
    for cate in cates:
        res = requests.get('https://m.dcinside.com/mcategory/%s' % cate)
        reses.extend(re.findall(r'<a href="https://m.dcinside.com/board/([^"]+)">([^<]+)<', res.text))
    return reses
def getGalleryIndex():
    res = {}
    res.update(getMajorGalleryIndex())
    res.update(getMinorGalleryIndex())
    sub = requests.get('https://json.dcinside.com/App/gall_name_sub.php')
    res.update({gall['name']: gall['ko_name'] for gall in sub.json()})
    return res
    
def put():
    index = getGalleryIndex()
    datastore.put(KEY, index)

def get():
    return datastore.get(KEY)
