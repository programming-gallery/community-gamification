import mobile_ip
import gallery_index
import gallery_map
import datetime

def log(msg):
    print(datetime.datetime.now(), '|', msg)

log("update mobile ip..")
#mobile_ip.put()
log("update gallery index..")
#gallery_index.put()
log("update gallery map..")
gallery_map.put()
