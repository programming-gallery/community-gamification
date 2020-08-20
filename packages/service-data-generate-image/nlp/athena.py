import math
import os
import datetime
import re
from pyathena import connect

def log(msg):
    print(datetime.datetime.now(), '|', msg)

def saveCorpus(path, duration_in_days = 30):
    cursor = connect(work_group='primary').cursor()
    min_date_with_hours = (datetime.datetime.utcnow() - datetime.timedelta(days=duration_in_days)).strftime('%Y-%m-%d-%H')
    now = datetime.datetime.utcnow().strftime('%Y-%m-%d-%H')
    cursor.execute(f"""
      SELECT
        title
      FROM cg_dev.dcinside_document
      WHERE dateWithHours >= '{min_date_with_hours}' AND title IS NOT NULL;
    """)
    res = cursor.fetchall()
    with open(path, 'w') as f:
        f.write('\n'.join(row[0] for row in res))
    return path

def saveCorpusByGalleryId(dir, duration_in_days = 30):
    cursor = connect(work_group='primary').cursor()
    min_date_with_hours = (datetime.datetime.utcnow() - datetime.timedelta(days=duration_in_days)).strftime('%Y-%m-%d-%H')
    now = datetime.datetime.utcnow().strftime('%Y-%m-%d-%H')
    cursor.execute(f"""
      SELECT
        galleryId, array_join(array_agg(title), '\n')
      FROM cg_dev.dcinside_document
      WHERE dateWithHours >= '{min_date_with_hours}' AND title IS NOT NULL
      GROUP BY 1, 2;
    """)
    res = cursor.fetchall()
    if not os.path.exists(dir):
        os.mkdir(dir)
    galleryIdToCorpus = {}
    fromIndex = -1
    lastGallery = None
    for gallery, corpus in res:
        with open(os.path.join(dir, gallery + '.txt'), 'w') as f:
            f.write(corpus)
    return dir

def saveCorpusByGalleryIdAndUserId(dir, duration_in_days = 30):
    cursor = connect(work_group='primary').cursor()
    min_date_with_hours = (datetime.datetime.utcnow() - datetime.timedelta(days=duration_in_days)).strftime('%Y-%m-%d-%H')
    now = datetime.datetime.utcnow().strftime('%Y-%m-%d-%H')
    cursor.execute(f"""
      SELECT
        galleryId, COALESCE(userId, userNickname || '#' || userIp), array_join(array_agg(title), '\n')
      FROM cg_dev.dcinside_document
      WHERE dateWithHours >= '{min_date_with_hours}' AND title IS NOT NULL
      GROUP BY 1, 2;
    """)
    res = cursor.fetchall()
    if not os.path.exists(dir):
        os.mkdir(dir)
    galleryIdToCorpus = {}
    fromIndex = -1
    lastGallery = None
    paths = []
    for gallery, user, corpus in res:
        subdir = os.path.join(dir, gallery.replace('/', '%2F'))
        if not os.path.exists(subdir):
            os.mkdir(subdir)
        path = os.path.join(subdir, user.replace('/', '%2F') + '.txt')
        paths.append(path)
        with open(path, 'w') as f:
            f.write(corpus)
    return paths
