import boto3
import os
import json
import datastore

KEY = 'mobile-ip'

def put():
    ip = ["203.226",
            "211.234",
            "39.7",
            "110.70",
            "175.223",
            "211.246",
            "61.43",
            "211.234",
            "27.176",
            "203.226",
            "39.7",
            "110.70",
            "175.223",
            "211.246",
            "117.111",
            "211.36",
            "106.102",
            "223.38",
            "118.235",
            "106.101",
            "110.70"]
    ip.extend("223.%d" % i for i in range(32, 64))
    datastore.put(KEY, ip)

def get():
    return datastore.get(KEY)
