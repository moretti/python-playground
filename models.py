import base64
import hashlib
import settings
from google.appengine.ext import ndb

class Snippet(ndb.Model):
    body = ndb.TextProperty()
    
    @classmethod
    def create_key(cls, body):
        hash = hashlib.sha1(body + settings.SALT).digest()
        return ndb.Key('Snippet', base64.urlsafe_b64encode(hash)[:10])