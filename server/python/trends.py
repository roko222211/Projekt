from pytrends.request import TrendReq
import sys
import json
from datetime import datetime, timedelta
import time
import random


def get_trends_data(keyword, target_date, max_retries=3):
    """
    Fetch Google Trends data with retry logic for rate limiting
    
    Args:
        keyword: Search keyword
        target_date: Target date in YYYY-MM-DD format
        max_retries: Maximum number of retry attempts
    
    Returns:
        dict: Trends data or error information
    """
    for attempt in range(max_retries):
        try:
            # Add delay on retries (exponential backoff)
            if attempt > 0:
                delay = (2 ** attempt) + random.uniform(0, 1)  # 2s, 4s, 8s + jitter
                print(json.dumps({
                    'info': f'Rate limited, waiting {delay:.1f}s before retry {attempt + 1}/{max_retries}...'
                }), file=sys.stderr)
                time.sleep(delay)
            
            # ✅ FIXED: Removed retries and backoff_factor parameters
            # These caused "method_whitelist" error with urllib3 2.0+
            pytrends = TrendReq(
                hl='en-US',
                tz=360,
                timeout=(10, 25)
            )
            
            # Parse target date
            target = datetime.strptime(target_date, '%Y-%m-%d')
            
            # Get data for 9 days window (8 days before + target day)
            start_date = target - timedelta(days=8)
            end_date = target
            
            timeframe = f'{start_date.strftime("%Y-%m-%d")} {end_date.strftime("%Y-%m-%d")}'
            
            # Build payload and get data
            pytrends.build_payload([keyword], timeframe=timeframe)
            interest_over_time = pytrends.interest_over_time()
            
            if interest_over_time.empty:
                return {
                    'error': 'No data found for keyword',
                    'keyword': keyword,
                    'date': target_date
                }
            
            # Convert to dict with date as string
            data = []
            for idx, row in interest_over_time.iterrows():
                data.append({
                    'date': idx.strftime('%Y-%m-%d'),
                    'value': int(row[keyword])
                })
            
            # Find target date data
            target_value = None
            for item in data:
                if item['date'] == target_date:
                    target_value = item['value']
                    break
            
            return {
                'keyword': keyword,
                'target_date': target_date,
                'target_value': target_value,
                'all_data': data
            }
            
        except Exception as e:
            error_msg = str(e)
            
            # Check if it's a rate limit error (429)
            if '429' in error_msg or 'Too Many Requests' in error_msg or 'response with code 429' in error_msg:
                if attempt == max_retries - 1:
                    # Last attempt failed
                    return {
                        'error': 'Rate limited by Google Trends. Please wait 5-10 minutes and try again.',
                        'error_type': 'rate_limit',
                        'keyword': keyword,
                        'date': target_date
                    }
                # Otherwise, continue to next retry
                continue
            else:
                # Non-rate-limit error, return immediately
                return {
                    'error': error_msg,
                    'keyword': keyword,
                    'date': target_date
                }
    
    # Max retries exceeded
    return {
        'error': 'Max retries exceeded after rate limiting',
        'error_type': 'rate_limit',
        'keyword': keyword,
        'date': target_date
    }


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(json.dumps({'error': 'Usage: python trends.py <keyword> <date>'}))
        sys.exit(1)
    
    keyword = sys.argv[1]
    date = sys.argv[2]
    
    result = get_trends_data(keyword, date)
    print(json.dumps(result))
