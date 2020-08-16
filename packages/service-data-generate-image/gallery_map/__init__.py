import math
import numpy as np
import datetime
import re
from pyathena import connect

import gallery_index
import mobile_ip
import datastore
from gallery_map.models import umap, grid
import hdbscan

KEY = 'gallery-map'

def log(msg):
    print(datetime.datetime.now(), '|', msg)

def getGallerySimilaritiesWithUserCount(duration_in_days = 30):
    cursor = connect(work_group='primary').cursor()
    min_date_with_hours = (datetime.datetime.utcnow() - datetime.timedelta(days=duration_in_days)).strftime('%Y-%m-%d-%H')
    mobile_ips = mobile_ip.get()
    #mobile_users = ['ㅇㅇ#%s' % ip for ip in mobile_ips]
    cursor.execute(f"""
    WITH cte AS (
      SELECT 
        galleryId, 
        array_agg(distinct coalesce(userId, userNickname || '#' || userIp)) users,
        filter(array_agg(distinct userId), x -> x IS NOT NULL) staticUsers,
        filter(array_agg(distinct CASE 
            WHEN userNickname <> 'ㅇㅇ' AND userIp <> ALL (VALUES {', '.join("'%s'" % ip for ip in mobile_ips)}) THEN 
                userNickname || '#' || userIp
            ELSE 
                NULL
            END), x -> x IS NOT NULL) dynamicUsers
      FROM cg_dev.dcinside_document
      WHERE 
        dateWithHours >= '{min_date_with_hours}' 
      GROUP BY 1 
    )
    SELECT 
      c1.galleryId galleryId1, 
      c2.galleryId galleryId2, 
      -- cardinality(array_intersect(c1.users, c2.users))*1.0 similarity,
        (1.0*cardinality(array_intersect(c1.staticUsers, c2.staticUsers))
        + 1.0*cardinality(array_intersect(c1.dynamicUsers, c2.dynamicUsers))) / 
          ((cardinality(c1.staticUsers) + cardinality(c2.staticUsers) - 1.0*cardinality(array_intersect(c1.staticUsers, c2.staticUsers)))
          + (cardinality(c1.dynamicUsers)*1.0 + cardinality(c2.dynamicUsers)*1.0 - cardinality(array_intersect(c1.dynamicUsers, c2.dynamicUsers))*1.0))
      similarity,
      cardinality(c1.users) userCount1,
      cardinality(c2.users) userCount2,
      cardinality(array_intersect(c1.users, c2.users)) commonUserCount
      FROM cte AS c1
      CROSS JOIN cte AS c2 
      WHERE 
        c1.galleryId > c2.galleryId AND 
        cardinality(array_intersect(c1.users, c2.users)) > 10 AND
        cardinality(c1.users) > 100 AND
        cardinality(c2.users) > 100
      ORDER BY 3 DESC
      LIMIT 300000;
    """)
    print(f"""
    WITH cte AS (
      SELECT 
        galleryId, 
        -- array_agg(distinct userId) users
        array_agg(distinct coalesce(userId, userNickname || '#' || userIp)) users,
        filter(array_agg(distinct userId), x -> x IS NOT NULL) staticUsers,
        filter(array_agg(distinct CASE 
            WHEN userNickname <> 'ㅇㅇ' AND userIp <> ALL (VALUES {', '.join("'%s'" % ip for ip in mobile_ips)}) THEN 
                userNickname || '#' || userIp
            ELSE 
                NULL
            END), x -> x IS NOT NULL) dynamicUsers
      FROM cg_dev.dcinside_document
      WHERE 
        dateWithHours >= '{min_date_with_hours}'
      GROUP BY 1 
    )
    SELECT 
      c1.galleryId galleryId1, 
      c2.galleryId galleryId2, 
      -- cardinality(array_intersect(c1.users, c2.users))*1.0 similarity,
        (1.0*cardinality(array_intersect(c1.staticUsers, c2.staticUsers))
        + 0.5*cardinality(array_intersect(c1.dynamicUsers, c2.dynamicUsers))) / 
          ((cardinality(c1.staticUsers) + cardinality(c2.staticUsers) - 1.0*cardinality(array_intersect(c1.staticUsers, c2.staticUsers)))
          + (cardinality(c1.dynamicUsers)*0.5 + cardinality(c2.dynamicUsers)*0.5 - cardinality(array_intersect(c1.dynamicUsers, c2.dynamicUsers))*0.5))
      similarity,
      cardinality(c1.users) userCount1,
      cardinality(c2.users) userCount2,
      cardinality(array_intersect(c1.users, c2.users)) commonUserCount
      FROM cte AS c1
      CROSS JOIN cte AS c2 
      WHERE 
        c1.galleryId > c2.galleryId AND 
        cardinality(array_intersect(c1.users, c2.users)) > 10 AND
        cardinality(c1.users) > 100 AND 
        cardinality(c2.users) > 100 
      ORDER BY 3 DESC
      LIMIT 300000;
    """)
    res = cursor.fetchall()
    return res

def getGalleryMap():
    log('get gallery index..')
    index = gallery_index.get()
    log('get gallery similarities..')
    res = getGallerySimilaritiesWithUserCount()
    gallery_ids = list(set(row[0] for row in res).union(row[1] for row in res))
    gallery_id_to_index = {id:i for i, id in enumerate(gallery_ids)}
    gallery_id_to_user_cardinalities = {row[0]: row[3] for row in res}
    gallery_id_to_user_cardinalities.update({row[1]: row[4] for row in res})
    gallery_user_cardinalities = [gallery_id_to_user_cardinalities[id] for id in gallery_ids]
    relative_galleries = {}
    for row in res:
        if row[0] not in relative_galleries:
            relative_galleries[row[0]] = []
        relative_galleries[row[0]].append((gallery_id_to_index[row[1]], row[5]))
        if row[1] not in relative_galleries:
            relative_galleries[row[1]] = []
        relative_galleries[row[1]].append((gallery_id_to_index[row[0]], row[5]))

    cardinality = len(gallery_ids)
    log("cardinality %s" % cardinality)
    log('calculate gallery umap..')
    distance_matrix = 1 / np.eye(cardinality) - 1
    for gallery_id1, gallery_id2, similarity, a, b, c in res:
        index1 = gallery_id_to_index[gallery_id1]
        index2 = gallery_id_to_index[gallery_id2]
        if similarity == 0:
            distance_matrix[index1, index2] = np.inf
            distance_matrix[index2, index1] = np.inf
        else:
            distance_matrix[index1, index2] = 1.0/similarity
            distance_matrix[index2, index1] = 1.0/similarity
    #pos = umap(distance_matrix, min_dist=0, n_neighbors=min(200,cardinality-1), random_state=42)
    log('cluster galleries..')
    pos = umap(distance_matrix, min_dist=0.0, n_neighbors=cardinality//16, random_state=42)
    pos -= pos.min(axis=0)
    pos /= pos.max(axis=0)
    '''
    scaled_pos = []
    scaled_indexes = []
    index_to_scaled_coordinate_index = [[] for _ in range(len(gallery_ids))]
    for i, p in enumerate(pos):
        for _ in range(math.ceil(gallery_user_cardinalities[i]/100)):
            scaled_pos.append(p)
            scaled_indexes.append(i)
            index_to_scaled_coordinate_index[i].append(len(scaled_pos)-1)
    scaled_pos = np.array(scaled_pos)
    coordinate = grid(scaled_pos ,3)
    '''
    #pos = umap(distance_matrix, min_dist=0.0, n_neighbors=cardinality//16, random_state=42, n_components=50)
    pos2 = umap(distance_matrix, min_dist=0.0, n_neighbors=cardinality//16, random_state=42, n_components=20)
    cluster = hdbscan.HDBSCAN(cluster_selection_method='leaf', prediction_data=True, cluster_selection_epsilon=0.01)
    clusterer = cluster.fit(pos2)
    soft_cluster = hdbscan.all_points_membership_vectors(clusterer)
    soft_cluster = [int(np.argmax(x)) for x in soft_cluster]

    area = sum(gallery_user_cardinalities[i])*3
    radiuses = [(car/area)**0.5 for car in gallery_user_cardinalities]

    galleries = [{
        'id': id, 
        'name': index.get(id), 
        'userCount': gallery_user_cardinalities[i], 
        'relativeGalleries': [{
            'index': x[0],
            'commonUserCount': x[1]
            } for x in sorted(relative_galleries[id], key=lambda x: -x[1])[:10]],
        #'coordinates': [coordinate[ci].tolist() for ci in index_to_scaled_coordinate_index[i]],
        'node': {'x': float(pos[i][0]), 'y': float(pos[i][1]), 'r': radiuses[i] },
        'cluster': int(cluster.labels_[i]),
        'softcluster': soft_cluster[i],
        } for i, id in enumerate(gallery_ids)]
    return galleries

def put():
    data = getGalleryMap()
    datastore.put(KEY, data)

def get():
    return datastore.get(KEY)
